const { Duration, aws_ecs, aws_iam, aws_certificatemanager,
    aws_elasticloadbalancingv2, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateTaskDefinition, FargateService } = aws_ecs;
const CERT_ARN = process.env.REPORT_PORTAL_CERT_ARN;

module.exports = class TraefikService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { cluster, albSecurityGroup, fargateSecurityGroup } = props;

        // Create a new task definition for UI and Traefik
        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalTraefikTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('Traefik', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/traefik:v2.11.2`),
            logging: this.logDriver,
            portMappings: [
                // { containerPort: 80 },
                // { containerPort: 443 },
                { containerPort: 8080 }, // ReportPortal UI
                { containerPort: 8081 }  // Traefik dashboard
            ],
            environment: {
                'ECS_ENABLE_CONTAINER_METADATA': 'true'
            },
            command: [
                "--providers.ecs=true",
                "--ping=true",
                "--ping.entrypoint=web",
                "--providers.ecs.region=us-east-1",
                '--providers.ecs.clusters=' + cluster.clusterName,
                "--providers.ecs.autodiscoverclusters=true",
                "--providers.ecs.exposedByDefault=false",
                // "--providers.ecs.exposedByDefault=true",
                "--providers.ecs.refreshSeconds=60",
                '--entrypoints.web.address=:8080',
                // '--entrypoints.websecure.address=:443',
                '--entrypoints.traefik.address=:8081',  // Changed to 8082
                "--api.dashboard=true",
                "--api.insecure=true",
                "--log.level=DEBUG",
                "--accesslog=true",
                "--accesslog.format=json"
            ],
        });
        this.container.taskDefinition.addToTaskRolePolicy(new aws_iam.PolicyStatement({
            actions: ['ecs:ListTasks', 'ecs:DescribeTasks', 'ecs:DescribeContainerInstances', 'ecs:DescribeTaskDefinition'],
            resources: ['*']
        }));
        this.container.taskDefinition.addToExecutionRolePolicy(new aws_iam.PolicyStatement({
            actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: ['*']
        }));

        // Create an Application Load Balancer
        const alb = new aws_elasticloadbalancingv2.ApplicationLoadBalancer(scope, 'TraefikALB', {
            vpc: cluster.vpc,
            internetFacing: true,
            securityGroup: albSecurityGroup
        });

        // Create target groups
        const targetGroup8080 = new aws_elasticloadbalancingv2.ApplicationTargetGroup(scope, 'TraefikTargetGroup8080', {
            vpc: cluster.vpc,
            port: 8080,
            protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
            targetType: aws_elasticloadbalancingv2.TargetType.IP,
            healthCheck: {
                path: '/',
                healthyHttpCodes: '200-399'
            }
        });

        const targetGroup8081 = new aws_elasticloadbalancingv2.ApplicationTargetGroup(scope, 'TraefikTargetGroup8081', {
            vpc: cluster.vpc,
            port: 8081,
            protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
            targetType: aws_elasticloadbalancingv2.TargetType.IP,
            healthCheck: {
                path: '/',
                healthyHttpCodes: '200-399'
            }
        });

        // Create HTTPS listener
        const httpsListener = alb.addListener('TraefikHttpsListener', {
            port: 443,
            certificates: [aws_certificatemanager.Certificate.fromCertificateArn(scope, 'Cert', CERT_ARN)],
            protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTPS
        });

        httpsListener.addAction('TraefikRoute8081', {
            priority: 1,
            conditions: [
                aws_elasticloadbalancingv2.ListenerCondition.pathPatterns(['/dashboard', '/dashboard/', '/dashboard/*'])
            ],
            action: aws_elasticloadbalancingv2.ListenerAction.forward([targetGroup8081])
        });

        // Add routing rules
        httpsListener.addAction('TraefikRoute8080', {
            priority: 2,
            conditions: [
                aws_elasticloadbalancingv2.ListenerCondition.pathPatterns(['/', '/*'])
            ],
            action: aws_elasticloadbalancingv2.ListenerAction.forward([targetGroup8080])
        });

        httpsListener.addAction('Default', {
            action: aws_elasticloadbalancingv2.ListenerAction.fixedResponse(200, {
                contentType: 'text/plain',
                messageBody: 'Default response'
            })
        });

        this.fargateService = new FargateService(scope, 'ReportPortalTraefikFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-traefik',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });

        // Associate target groups with the Fargate service
        this.fargateService.attachToApplicationTargetGroup(targetGroup8080);
        this.fargateService.attachToApplicationTargetGroup(targetGroup8081);
    }
}


