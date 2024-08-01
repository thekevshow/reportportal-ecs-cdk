const { Duration, aws_ecs, aws_servicediscovery } = require('aws-cdk-lib');
const AbstractService = require('./AbstractService');
const { ContainerImage, FargateService, FargateTaskDefinition } = aws_ecs;

module.exports = class ReportPortalServiceIndexService extends AbstractService {
    constructor(scope, props) {
        super(scope, props);
        const { cluster, fargateSecurityGroup } = props;

        // Create a new task definition for UI and Traefik
        this.taskDefinition = new FargateTaskDefinition(scope, 'ReportPortalServiceIndexTaskDef', {
            memoryLimitMiB: 2048,
            cpu: 1024,
            executionRole: this.executionRole,
            taskRole: this.taskRole
        });

        this.container = this.taskDefinition.addContainer('ReportPortalServiceIndex', {
            image: ContainerImage.fromRegistry(`${process.env.AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/reportportal-service-index:5.11.0`),
            logging: this.logDriver,
            environment: {
                // talking to gateway traefik
                LB_URL: 'http://reportportal-traefik.reportportal.local:8081',
                TRAEFIK_V2_MODE: 'true'
            },
            portMappings: [
                { containerPort: 8080 }
            ],
            dockerLabels: {
                "traefik.http.routers.index.rule": "PathPrefix(`/`)",
                "traefik.http.routers.index.service": "index",
                "traefik.http.services.index.loadbalancer.server.port": "8080",
                "traefik.http.services.index.loadbalancer.server.scheme": "http",
                "traefik.expose": "true",
                "traefik.enable": "true"
            },
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

        this.fargateService = new FargateService(scope, 'ReportPortalServiceIndexFargateService', {
            cluster,
            taskDefinition: this.taskDefinition,
            desiredCount: 1,
            securityGroups: [fargateSecurityGroup],
            assignPublicIp: false,
            cloudMapOptions: {
                name: 'reportportal-service-index',
                dnsRecordType: aws_servicediscovery.DnsRecordType.A,
                dnsTtl: Duration.seconds(30),
                cloudMapNamespace: props.namespace
            },
        });
    }
}