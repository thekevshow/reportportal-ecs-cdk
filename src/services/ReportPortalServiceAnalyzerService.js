const { Duration, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalServiceAnalyzerService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { cluster, fargateSecurityGroup } = props;

        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalServiceAnalyzerTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalServiceAnalyzer', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-auto-analyzer:5.11.0-r1`),
            logging: this.logDriver, // Ensure you have a common log driver set up as per previous setups
            environment: {
                LOGGING_LEVEL: 'info',
                AMQP_EXCHANGE_NAME: 'analyzer-default',
                AMQP_VIRTUAL_HOST: 'analyzer',
                // AMQP_URL: 'amqp://rabbitmq:rabbitmq@rabbitmq:5672', // Adjust as needed for real credentials and discovery
                AMQP_URL: 'amqp://rabbitmq:rabbitmq@reportportal-rabbitmq.reportportal.local:5672',
                // ES_USER:  // Uncomment and set these if needed
                // ES_PASSWORD: 
                ES_HOSTS: 'http://reportportal-opensearch.reportportal.local:9200',
                ANALYZER_BINARYSTORE_TYPE: 'filesystem'
            },
            portMappings: [
                // Assuming ports if they need to be exposed, otherwise remove if internal only
            ]
        });

        this.fargateService = new FargateService(scope, 'ReportPortalServiceAnalyzerFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-service-analyzer',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}