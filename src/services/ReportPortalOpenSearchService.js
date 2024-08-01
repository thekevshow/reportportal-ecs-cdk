const { Duration, RemovalPolicy, aws_servicediscovery, aws_ecs, aws_ec2, aws_iam, aws_efs } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateService } = aws_ecs;

module.exports = class ReportPortalOpenSearchService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);

        const { databaseStack, cluster, fargateSecurityGroup } = props;
        const { vpc } = databaseStack;

        // EFS configuration
        this.efsSecurityGroup = new aws_ec2.SecurityGroup(scope, 'ReportPortalOpenSearchEfsSecurityGroup', { vpc });
        this.efsSecurityGroup.addIngressRule(aws_ec2.Peer.ipv4(vpc.vpcCidrBlock), aws_ec2.Port.tcp(2049), 'Allow NFS traffic from the VPC');
        const fileSystem = new aws_efs.FileSystem(scope, 'ReportPortalEfsFileSystem', {
            vpc,
            encrypted: true,
            performanceMode: aws_efs.PerformanceMode.GENERAL_PURPOSE,
            throughputMode: aws_efs.ThroughputMode.BURSTING,
            removalPolicy: RemovalPolicy.DESTROY,
            securityGroup: this.efsSecurityGroup,
            // allowAnonymousAccess: false,
        });
        const opensearchAccessPoint = new aws_efs.AccessPoint(scope, 'ReportPortalOpenSearchAccessPoint', {
            fileSystem,
            path: '/opensearch/data',
            posixUser: {
                uid: '1000',
                gid: '1000',
            },
            createAcl: {
                ownerUid: '1000',
                ownerGid: '1000',
                permissions: '755',
            },
        });

        const taskRole = new aws_iam.Role(scope, 'ReportPortalOpenSearchTaskRole', {
            assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
            ],
        });
        fileSystem.grant(taskRole, 'elasticfilesystem:ClientMount', 'elasticfilesystem:ClientWrite', 'elasticfilesystem:DescribeMountTargets');
        const executionRole = new aws_iam.Role(scope, 'ReportPortalOpenSearchExecutionRole', {
            assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
        });

        // cluster and task definition creation
        const taskDefinition = new aws_ecs.FargateTaskDefinition(scope, 'OpenSearchTaskDef', {
            memoryLimitMiB: (2048 * 4),
            cpu: (1024 * 4),
            taskRole: taskRole,
            executionRole: executionRole,
        });
        taskDefinition.addVolume({
            name: 'opensearch-data',
            efsVolumeConfiguration: {
                fileSystemId: fileSystem.fileSystemId,
                transitEncryption: 'ENABLED',
                authorizationConfig: {
                    accessPointId: opensearchAccessPoint.accessPointId,
                },
            },
        });

        const opensearchContainer = taskDefinition.addContainer('ReportPortalOpensearch', {
            image: ContainerImage.fromRegistry('opensearchproject/opensearch:2.15.0'),
            logging: this.logDriver,
            environment: {
                // 'cluster.name': 'opensearch-cluster',
                // 'node.name': 'opensearch-node1',
                // 'discovery.seed_hosts': 'opensearch-node1',
                // 'cluster.initial_cluster_manager_nodes': 'opensearch-node1',
                'bootstrap.memory_lock': 'true',
                'OPENSEARCH_JAVA_OPTS': '-Xms512m -Xmx512m',
                'discovery.type': 'single-node',
                'plugins.security.disabled': "true",
                'DISABLE_INSTALL_DEMO_CONFIG': "true",
                // we do not set
                // 'OPENSEARCH_INITIAL_ADMIN_PASSWORD': process.env.OPENSEARCH_INITIAL_ADMIN_PASSWORD
            },
            portMappings: [
                { containerPort: 9200 },
                { containerPort: 9600 } // Add this if you decide to expose it
            ],
            ulimits: [{
                name: aws_ecs.UlimitName.MEMLOCK,
                softLimit: -1,
                hardLimit: -1
            },
            {
                name: aws_ecs.UlimitName.NOFILE,
                softLimit: 65536,
                hardLimit: 262144
            }],
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -f http://localhost:9200 || exit 1'
                ],
                interval: Duration.seconds(60),
                timeout: Duration.seconds(30),
                retries: 10,
                startPeriod: Duration.seconds(60)
            }
        });
        // ADD our volumes
        opensearchContainer.addMountPoints({
            sourceVolume: 'opensearch-data',
            containerPath: '/usr/share/opensearch/data',
            readOnly: false,
        });

        // Create security groups
        fargateSecurityGroup.addIngressRule(fileSystem.connections.securityGroups[0], aws_ec2.Port.tcp(2049));

        this.fargateService = new FargateService(scope, 'ReportPortalOpenSearchFargateService', {
            cluster: cluster,
            taskDefinition: taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup, this.efsSecurityGroup],
            cloudMapOptions: {
                name: 'reportportal-opensearch',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(10),
                cloudMapNamespace: cluster.defaultCloudMapNamespace
            }
        });
    }
}