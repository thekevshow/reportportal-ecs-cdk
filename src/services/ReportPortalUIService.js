const { Duration, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalUIService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { cluster, fargateSecurityGroup } = props;

        // Create a new task definition for UI and Traefik
        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalUITaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalUI', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-ui:5.11.1`),
            logging: this.logDriver,
            environment: {
                RP_SERVER_PORT: "8080",
                RP_SERVER: 'http://reportportal-api.reportportal.local:8585',
            },
            dockerLabels: {
                "traefik.http.middlewares.ui-strip-prefix.stripprefix.prefixes": "/ui",
                "traefik.http.routers.ui.middlewares": "ui-strip-prefix@ecs",
                "traefik.http.routers.ui.rule": "PathPrefix(`/ui`)",
                "traefik.http.routers.ui.service": "ui",
                "traefik.http.services.ui.loadbalancer.server.port": "8080",
                "traefik.http.services.ui.loadbalancer.server.scheme": "http",
                "traefik.expose": "true",
                "traefik.enable": "true"
            },
            secrets: {},
            portMappings: [
                { containerPort: 8080 }
            ],
            healthCheck: {
                command: [
                    'CMD-SHELL',
                    'wget -q --spider http://localhost:8080/health'
                ],
                interval: Duration.seconds(30),
                timeout: Duration.seconds(30),
                retries: 10,
                startPeriod: Duration.seconds(10)
            }
        });

        this.fargateService = new FargateService(scope, 'ReportPortalUIFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-ui',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}