const { Duration, Fn, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, Secret, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalMetricsGathererService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { databaseStack, cluster, fargateSecurityGroup } = props;
        const { database } = databaseStack;

        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalMetricsGathererTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalMetricsGatherer', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-metrics-gatherer:5.11.0-r1`),
            logging: this.logDriver,
            environment: {
                LOGGING_LEVEL: 'info',
                // ES_HOST: 'http://opensearch:9200',
                ES_HOSTS: 'http://reportportal-opensearch.reportportal.local:9200',
                POSTGRES_DB: 'reportportal',
                POSTGRES_HOST: Fn.importValue('ReportPortalDatabaseStack:DatabaseEndpoint'),
                POSTGRES_PORT: '5432',
                ALLOWED_START_TIME: "22:00",
                ALLOWED_END_TIME: "08:00",
                // AMQP_URL: 'amqp://rabbitmq:rabbitmq@rabbitmq:5672',  // Ensure the credentials are securely managed
                AMQP_URL: 'amqp://rabbitmq:rabbitmq@reportportal-rabbitmq.reportportal.local:5672',
                AMQP_VIRTUAL_HOST: 'analyzer'
            },
            secrets: {
                POSTGRES_USER: Secret.fromSecretsManager(database.secret, 'username'),
                POSTGRES_PASSWORD: Secret.fromSecretsManager(database.secret, 'password'),
            },
        });

        this.fargateService = new FargateService(scope, 'ReportPortalMetricsGathererFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-metrics-gatherer',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}