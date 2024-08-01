const { Duration, Fn, aws_ecs, aws_iam, aws_logs } = require('aws-cdk-lib');
const { ContainerImage, Secret } = aws_ecs;

module.exports = class ReportPortalMigrationsTaskDef {
    constructor(scope, props) {

        const { databaseStack } = props;
        const { database } = databaseStack;

        const logGroup = new aws_logs.LogGroup(scope, 'ReportPortalMigrationsLogGroup', {
            retention: aws_logs.RetentionDays.ONE_WEEK,
        });
        const logDriver = new aws_ecs.AwsLogDriver({
            streamPrefix: 'ReportPortalMigrations',
            logGroup,
        });

        const taskRole = new aws_iam.Role(scope, 'ReportPortalMigrationsTaskRole', {
            assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
            ],
        });
        const executionRole = new aws_iam.Role(scope, 'ReportPortalMigrationsExecutionRole', {
            assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
        });

        const migrationsTaskDefinition = new aws_ecs.FargateTaskDefinition(scope, 'ReportPortalMigrationsTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            taskRole: taskRole,
            executionRole: executionRole,
        });

        this.migrationsContainer = migrationsTaskDefinition.addContainer('ReportPortalMigrationsContainer', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-migrations:5.11.1`),
            logging: logDriver,
            environment: {
                POSTGRES_SERVER: Fn.importValue('ReportPortalDatabaseStack:DatabaseEndpoint'),
                POSTGRES_PORT: '5432',
                POSTGRES_DB: 'reportportal',
                // OS_HOST: 'opensearch',
                OS_HOST: 'reportportal-opensearch.reportportal.local',
                OS_PORT: '9200',
                OS_PROTOCOL: 'http',
                // OS_USER: "admin",
                // OS_PASSWORD: process.env.OPENSEARCH_INITIAL_ADMIN_PASSWORD
            },
            secrets: {
                POSTGRES_USER: Secret.fromSecretsManager(database.secret, 'username'),
                POSTGRES_PASSWORD: Secret.fromSecretsManager(database.secret, 'password'),
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    // 'curl -f http://opensearch:9200/_cluster/health || exit 1'
                    'curl -f http://reportportal-opensearch.reportportal.local:9200/_cluster/health || exit 1'
                ],
                interval: Duration.seconds(60),
                timeout: Duration.seconds(30),
                retries: 10,
                startPeriod: Duration.seconds(60)
            },
        });

        // Grant ECS task role access to read the database secret
        database.secret.grantRead(this.migrationsContainer.taskDefinition.taskRole);
    }
}