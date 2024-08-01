const { Duration, Fn, aws_ecs, aws_iam, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, Secret, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalApiService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { databaseStack, cluster, fargateSecurityGroup } = props;
        const { database } = databaseStack;

        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalApiTaskDef', {
            memoryLimitMiB: 2048 * 2,
            cpu: 1024 * 2,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalApiService', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-api:5.11.2`),
            logging: this.logDriver,
            environment: {
                RP_DB_HOST: Fn.importValue('ReportPortalDatabaseStack:DatabaseEndpoint'),
                RP_DB_PORT: Fn.importValue('ReportPortalDatabaseStack:DatabasePort'),
                RP_DB_NAME: 'reportportal',
                RABBITMQ_DEFAULT_USER: "rabbitmq",
                RABBITMQ_DEFAULT_PASS: "rabbitmq",
                RP_AMQP_HOST: 'reportportal-rabbitmq.reportportal.local',
                RP_AMQP_PORT: '5672',
                RP_AMQP_USER: 'rabbitmq',
                RP_AMQP_PASS: 'rabbitmq',
                RP_AMQP_APIUSER: 'rabbitmq',
                RP_AMQP_APIPASS: 'rabbitmq',
                RP_AMQP_ANALYZER_VHOST: 'analyzer',
                DATASTORE_TYPE: 'filesystem',
                LOGGING_LEVEL_ORG_HIBERNATE_SQL: 'info',
                RP_REQUESTLOGGING: "false",
                AUDIT_LOGGER: "OFF",
                MANAGEMENT_HEALTH_ELASTICSEARCH_ENABLED: "false",
                RP_ENVIRONMENT_VARIABLE_ALLOW_DELETE_ACCOUNT: "false",
                JAVA_OPTS: "-Xmx1g -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp -Dcom.sun.management.jmxremote.rmi.port=12349 -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.local.only=false -Dcom.sun.management.jmxremote.port=9010 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=0.0.0.0",
                RP_JOBS_BASEURL: 'http://reportportal-jobs.reportportal.local:8686',
                COM_TA_REPORTPORTAL_JOB_INTERRUPT_BROKEN_LAUNCHES_CRON: 'PT1H',
                RP_ENVIRONMENT_VARIABLE_PATTERN_ANALYSIS_BATCH_SIZE: '100',
                RP_ENVIRONMENT_VARIABLE_PATTERN_ANALYSIS_PREFETCH_COUNT: '1',
                RP_ENVIRONMENT_VARIABLE_PATTERN_ANALYSIS_CONSUMERS_COUNT: '1',
                LOGGING_LEVEL_ROOT: 'DEBUG',
                LOGGING_LEVEL_COM_EPAM_TA_REPORTPORTAL: 'DEBUG',
            },
            secrets: {
                RP_DB_USER: Secret.fromSecretsManager(database.secret, 'username'),
                RP_DB_PASSWORD: Secret.fromSecretsManager(database.secret, 'password'),
                RP_DB_PASS: Secret.fromSecretsManager(database.secret, 'password')
            },
            portMappings: [
                { containerPort: 8585 }
            ],
            dockerLabels: {
                "traefik.http.middlewares.api-strip-prefix.stripprefix.prefixes": "/api",
                "traefik.http.routers.api.middlewares": "api-strip-prefix@ecs",
                "traefik.http.routers.api.rule": "PathPrefix(`/api`)",
                "traefik.http.routers.api.service": "api",
                "traefik.http.services.api.loadbalancer.server.port": "8585",
                "traefik.http.services.api.loadbalancer.server.scheme": "http",
                "traefik.expose": "true",
                "traefik.enable": "true"
            },
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'curl -f http://localhost:8585/health'
                ],
                interval: Duration.seconds(60),
                timeout: Duration.seconds(30),
                retries: 10,
                startPeriod: Duration.seconds(60)
            },
        });
        this.taskDefinition.addToTaskRolePolicy(new aws_iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [database.secret.secretArn]
        }));
        // this.container.addContainerDependencies({
        //     container: rabbitMQContainer,
        //     condition: aws_ecs.ContainerDependencyCondition.HEALTHY
        // });
        // If you have a gateway container, add it as a dependency too
        // if (traefikContainer) {
        //     reportPortalApi.addContainerDependencies({
        //         container: traefikContainer,
        //         condition: aws_ecs.ContainerDependencyCondition.START
        //     });
        // }

        this.fargateService = new FargateService(scope, 'ReportPortalApiFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-api',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}