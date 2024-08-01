const { Duration, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalAnalyzerTrainService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { cluster, fargateSecurityGroup } = props;

        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalAnalyzerTrainTaskDef', {
            memoryLimitMiB: 2048 * 2,
            cpu: 1024 * 1,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalAnalyzerTrain', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-auto-analyzer:5.11.0-r1`),
            logging: this.logDriver,
            environment: {
                LOGGING_LEVEL: 'info',
                AMQP_EXCHANGE_NAME: 'analyzer-default',
                AMQP_VIRTUAL_HOST: 'analyzer',
                // AMQP_URL: 'amqp://rabbitmq:rabbitmq@rabbitmq:5672',
                AMQP_URL: 'amqp://rabbitmq:rabbitmq@reportportal-rabbitmq.reportportal.local:5672',
                // ES_HOSTS: 'http://opensearch:9200',
                ES_HOSTS: 'http://reportportal-opensearch.reportportal.local:9200',
                INSTANCE_TASK_TYPE: 'train',
                UWSGI_WORKERS: '1',
                ANALYZER_BINARYSTORE_TYPE: 'filesystem'
            },
        });

        this.fargateService = new FargateService(scope, 'ReportPortalAnalyzerTrainFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-analyzer-train',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}