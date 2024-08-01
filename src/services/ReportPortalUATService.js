const { Duration, Fn, aws_ecs, aws_logs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, Secret, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalUATService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { databaseStack, cluster, fargateSecurityGroup } = props;
        const { database } = databaseStack;

        // Create a new task definition for UI and Traefik
        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalUATTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalUATService', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-authorization:5.11.1`),
            logging: new aws_ecs.AwsLogDriver({
                streamPrefix: 'UAT',
                logGroup: new aws_logs.LogGroup(scope, 'UATLogGroup', {
                    retention: aws_logs.RetentionDays.ONE_WEEK
                }),
            }),
            environment: {
                RP_DB_HOST: Fn.importValue('ReportPortalDatabaseStack:DatabaseEndpoint'),
                RP_DB_NAME: 'reportportal',
                RP_AMQP_HOST: 'reportportal-rabbitmq.reportportal.local', // Assuming service discovery setup or defined elsewhere in your stack
                RP_AMQP_PORT: '5672',
                RP_AMQP_USER: 'rabbitmq', // Fn.importValue('RabbitMQUser'),
                RP_AMQP_PASS: 'rabbitmq', // Fn.importValue('RabbitMQPassword'),
                RP_AMQP_APIUSER: 'rabbitmq', // Fn.importValue('RabbitMQUser'),
                RP_AMQP_APIPASS: 'rabbitmq', // Fn.importValue('RabbitMQPassword'),
                DATASTORE_TYPE: 'filesystem',
                RP_SESSION_LIVE: '86400',
                RP_SAML_SESSION_LIVE: '4320',
                RP_INITIAL_ADMIN_PASSWORD: 'erebus',
                JAVA_OPTS: '-Djava.security.egd=file:/dev/./urandom -XX:MinRAMPercentage=60.0 -XX:MaxRAMPercentage=90.0'
            },
            secrets: {
                RP_DB_USER: Secret.fromSecretsManager(database.secret, 'username'),
                RP_DB_PASSWORD: Secret.fromSecretsManager(database.secret, 'password'),
                RP_DB_PASS: Secret.fromSecretsManager(database.secret, 'password'),
            },
            portMappings: [
                { containerPort: 9999 } // The port must be exposed according to Docker Compose settings
            ],
            dockerLabels: {
                "traefik.http.middlewares.uat-strip-prefix.stripprefix.prefixes": "/uat",
                "traefik.http.routers.uat.middlewares": "uat-strip-prefix@ecs",
                "traefik.http.routers.uat.rule": "PathPrefix(`/uat`)",
                "traefik.http.routers.uat.service": "uat",
                "traefik.http.services.uat.loadbalancer.server.port": "9999",
                "traefik.http.services.uat.loadbalancer.server.scheme": "http",
                "traefik.expose": "true",
                "traefik.enable": "true"
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -f http://localhost:9999/health'
                ],
                interval: Duration.seconds(60),
                timeout: Duration.seconds(30),
                retries: 10,
                startPeriod: Duration.seconds(60)
            },
        });

        this.fargateService = new FargateService(scope, 'ReportPortalUATFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-uat',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}