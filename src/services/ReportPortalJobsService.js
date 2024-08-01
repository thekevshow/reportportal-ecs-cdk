const { Duration, Fn, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, Secret, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalJobsService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { databaseStack, cluster, fargateSecurityGroup } = props;
        const { database } = databaseStack;

        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalJobsTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalJobs', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-jobs:5.11.1`),
            logging: this.logDriver,
            environment: {
                RP_DB_HOST: Fn.importValue('ReportPortalDatabaseStack:DatabaseEndpoint'),
                RP_DB_NAME: 'reportportal',
                RP_AMQP_HOST: 'reportportal-rabbitmq.reportportal.local', // Assuming service discovery setup
                RP_AMQP_PORT: '5672',
                RP_AMQP_USER: 'rabbitmq', // Fn.importValue('RabbitMQUser'),
                RP_AMQP_PASS: 'rabbitmq', // Fn.importValue('RabbitMQPassword'),
                RP_AMQP_APIUSER: 'rabbitmq', // Fn.importValue('RabbitMQUser'),
                RP_AMQP_APIPASS: 'rabbitmq', // Fn.importValue('RabbitMQPassword'),
                RP_AMQP_ANALYZER_VHOST: 'reportportal-service-analyzer.reportportal.local',
                DATASTORE_TYPE: 'filesystem',
                RP_ENVIRONMENT_VARIABLE_CLEAN_ATTACHMENT_CRON: '0 0 */24 * * *',
                RP_ENVIRONMENT_VARIABLE_CLEAN_LOG_CRON: '0 0 */24 * * *',
                RP_ENVIRONMENT_VARIABLE_CLEAN_LAUNCH_CRON: '0 0 */24 * * *',
                RP_ENVIRONMENT_VARIABLE_CLEAN_STORAGE_CRON: '0 0 */24 * * *',
                RP_ENVIRONMENT_VARIABLE_STORAGE_PROJECT_CRON: '0 */5 * * * *',
                RP_ENVIRONMENT_VARIABLE_CLEAN_EXPIREDUSER_CRON: '0 0 */24 * * *',
                RP_ENVIRONMENT_VARIABLE_NOTIFICATION_EXPIREDUSER_CRON: '0 0 */24 * * *',
                RP_ENVIRONMENT_VARIABLE_CLEAN_EVENTS_RETENTIONPERIOD: '365',
                RP_ENVIRONMENT_VARIABLE_CLEAN_EVENTS_CRON: '0 30 05 * * *',
                RP_ENVIRONMENT_VARIABLE_CLEAN_STORAGE_CHUNKSIZE: '20000',
                RP_PROCESSING_LOG_MAXBATCHSIZE: '2000',
                RP_PROCESSING_LOG_MAXBATCHTIMEOUT: '6000',
                RP_AMQP_MAXLOGCONSUMER: '1',
                JAVA_OPTS: '-Djava.security.egd=file:/dev/./urandom -XX:+UseG1GC -XX:+UseStringDeduplication -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=60 -XX:MaxRAMPercentage=70.0 -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp'
            },
            secrets: {
                RP_DB_USER: Secret.fromSecretsManager(database.secret, 'username'),
                RP_DB_PASSWORD: Secret.fromSecretsManager(database.secret, 'password'),
                RP_DB_PASS: Secret.fromSecretsManager(database.secret, 'password'),
            },
            portMappings: [
                { containerPort: 8686 } // Match the exposed port in Docker Compose
            ],
            dockerLabels: {
                "traefik.http.middlewares.jobs-strip-prefix.stripprefix.prefixes": "/jobs",
                "traefik.http.routers.jobs.middlewares": "jobs-strip-prefix@ecs",
                "traefik.http.routers.jobs.rule": "PathPrefix(`/jobs`)",
                "traefik.http.routers.jobs.service": "jobs",
                "traefik.http.services.jobs.loadbalancer.server.port": "8686",
                "traefik.http.services.jobs.loadbalancer.server.scheme": "http",
                "traefik.expose": "true",
                "traefik.enable": "true"
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -f http://localhost:8686/health || exit 1'
                ],
                interval: Duration.seconds(60),
                timeout: Duration.seconds(30),
                retries: 10,
                startPeriod: Duration.seconds(60)
            },
        });

        this.fargateService = new FargateService(scope, 'ReportPortalJobsFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-jobs',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}