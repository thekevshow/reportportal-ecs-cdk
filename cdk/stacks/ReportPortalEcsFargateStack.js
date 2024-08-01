const { Stack, Fn, aws_ecs, aws_ec2, aws_servicediscovery } = require('aws-cdk-lib');
const { Cluster } = aws_ecs;
const { ReportPortalCoreService } = require('../../src');
const { ReportPortalMigrationsTaskDef } = require('../../src/taskdefs');

module.exports = class ReportPortalEcsFargateStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        const { vpc } = props.databaseStack;
        const cluster = new Cluster(this, 'ReportPortalCluster', {
            vpc,
            defaultCloudMapNamespace: {
                name: 'reportportal.local',
                vpc: vpc,
                type: aws_servicediscovery.NamespaceType.DNS_PRIVATE
            }
        });
        // Create security groups
        const albSecurityGroup = new aws_ec2.SecurityGroup(this, 'ReportPortalAlbSecurityGroup', { vpc, allowAllOutbound: true });
        const fargateSecurityGroup = new aws_ec2.SecurityGroup(this, 'ReportPortalFargateSecurityGroup', { vpc });

        // Allow ALB to communicate with Fargate
        albSecurityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(80));
        albSecurityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(443));
        albSecurityGroup.addIngressRule(fargateSecurityGroup, aws_ec2.Port.tcp(8080));
        albSecurityGroup.addIngressRule(fargateSecurityGroup, aws_ec2.Port.tcp(8081));
        albSecurityGroup.addIngressRule(albSecurityGroup, aws_ec2.Port.tcp(5432));

        // Allow Fargate to communicate with RDS and EFS
        fargateSecurityGroup.addIngressRule(albSecurityGroup, aws_ec2.Port.tcp(8080));
        fargateSecurityGroup.addIngressRule(albSecurityGroup, aws_ec2.Port.tcp(8081));
        fargateSecurityGroup.addIngressRule(albSecurityGroup, aws_ec2.Port.tcp(5432));

        // Allow inbound traffic from ALB to Fargate
        fargateSecurityGroup.addIngressRule(albSecurityGroup, aws_ec2.Port.allTcp(), 'Allow inbound from ALB');
        // Allow all traffic within the Fargate security group
        fargateSecurityGroup.addIngressRule(fargateSecurityGroup, aws_ec2.Port.allTraffic(), 'Allow all internal traffic');

        // Get the security group for the RDS instance and add ingress rule to allow Fargate security group
        const rdsSecurityGroup = aws_ec2.SecurityGroup.fromSecurityGroupId(this, 'ImportedReportPortalDatabaseSecurityGroup', Fn.importValue('ReportPortalDatabaseStack:DatabaseSecurityGroupId'));
        rdsSecurityGroup.addIngressRule(fargateSecurityGroup, aws_ec2.Port.tcp(5432));
        const securityGroup = new aws_ec2.SecurityGroup(this, 'SecurityGroup', { vpc });
        securityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(80), 'Allow HTTP traffic');
        securityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(8080), 'Allow HTTP traffic');
        securityGroup.addIngressRule(aws_ec2.Peer.anyIpv4(), aws_ec2.Port.tcp(8081), 'Allow HTTP traffic');

        const reportPortalMigrationsTaskDef = new ReportPortalMigrationsTaskDef(this, { ...props, albSecurityGroup, fargateSecurityGroup });
        const reportPortalCoreService = new ReportPortalCoreService(this, { ...props, cluster, albSecurityGroup, fargateSecurityGroup });
    }
}