const { Duration, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class RabbitMQService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { cluster, fargateSecurityGroup } = props;

        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalRabbitMQTaskDef', {
            memoryLimitMiB: 2048 * 2,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('RabbitMQ', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/rabbitmq:3.13.2`),
            logging: this.logDriver,
            environment: {
                RABBITMQ_DEFAULT_USER: 'rabbitmq',
                RABBITMQ_DEFAULT_PASS: 'rabbitmq',
                RABBITMQ_MANAGEMENT_ALLOW_WEB_ACCESS: "true",
                RABBITMQ_PLUGINS: 'rabbitmq_consistent_hash_exchange,rabbitmq_management,rabbitmq_auth_backend_ldap'
            },
            portMappings: [
                { containerPort: 5672 },
                { containerPort: 15672 }
            ],
            healthCheck: {
                // command: [ 'CMD-SHELL', 'rabbitmqctl status' ],
                // command: ["CMD-SHELL", "rabbitmq-diagnostics -q ping"],
                command: ["CMD", "curl", "-f", "http://localhost:15672"],
                interval: Duration.seconds(30),
                timeout: Duration.seconds(30),
                retries: 5,
                startPeriod: Duration.seconds(60)
            },
        });

        this.fargateService = new FargateService(scope, 'ReportPortalRabbitMQFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-rabbitmq',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}