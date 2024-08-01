const { Fn, aws_ecs, aws_iam, aws_logs, aws_secretsmanager } = require('aws-cdk-lib');

module.exports = class AbstractService {
    constructor(scope, props) {
        const className = this.constructor.name;

        this.logGroup = new aws_logs.LogGroup(scope, `ReportPortal${className}LogGroup`, {
            retention: aws_logs.RetentionDays.ONE_WEEK,
        });

        this.logDriver = new aws_ecs.AwsLogDriver({
            streamPrefix: `ReportPortal${className}`,
            logGroup: this.logGroup,
        });

        this.dbSecret = aws_secretsmanager.Secret.fromSecretAttributes(scope, `${className}DBSecret`, {
            secretCompleteArn: Fn.importValue('ReportPortalDatabaseStack:DatabaseSecretArn')
        });

        this.executionRole = new aws_iam.Role(scope, `${className}ReportPortalExecutionRole`, {
            assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'),
            ]
        });
        this.taskRole = new aws_iam.Role(scope, `${className}ReportPortalTaskRole`, {
            assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'),
            ]
        });
    }
}