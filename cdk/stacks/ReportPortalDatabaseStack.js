const { Stack, RemovalPolicy, CfnOutput, aws_ec2, aws_rds } = require('aws-cdk-lib');
const { DatabaseInstance, DatabaseInstanceEngine, PostgresEngineVersion, ParameterGroup } = aws_rds;

module.exports = class ReportPortalDatabaseStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // Create VPC
        this.vpc = new aws_ec2.Vpc(this, 'ReportPortalVpc', {
            maxAzs: 3 // Default is all AZs in region
        });

        const parameterGroup = new ParameterGroup(this, 'ReportPortalDatabaseParameterGroup', {
            engine: DatabaseInstanceEngine.postgres({ version: PostgresEngineVersion.VER_16_3 }),
            description: 'Parameter group that enforces SSL connections',
            parameters: {
                // 'rds.force_ssl': '1'
                'rds.force_ssl': '0'
            }
        });

        // Create RDS PostgreSQL instance
        this.database = new DatabaseInstance(this, 'ReportPortalDatabase', {
            engine: DatabaseInstanceEngine.postgres({ version: PostgresEngineVersion.VER_16_3 }),
            instanceType: aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T3, aws_ec2.InstanceSize.MICRO),
            vpc: this.vpc,
            databaseName: 'reportportal',
            credentials: aws_rds.Credentials.fromGeneratedSecret('reportportaluser', {
                excludeCharacters: '"^@/\\:;?#[]{}()%!`,<>&=+|$~*[]\''
            }),
            removalPolicy: RemovalPolicy.RETAIN,
            storageEncrypted: true, // Encrypt data at rest
            vpcSubnets: { subnetType: aws_ec2.SubnetType.PRIVATE_WITH_EGRESS },
            parameterGroup: parameterGroup,  // Use the custom parameter group,
            // publiclyAccessible: true
        });

        // Output VPC and RDS security group ID
        new CfnOutput(this, 'VpcId', {
            exportName: id + ":VpcId",
            value: this.vpc.vpcId
        });
        new CfnOutput(this, 'DatabaseSecurityGroupId', {
            exportName: id + ":DatabaseSecurityGroupId",
            value: this.database.connections.securityGroups[0].securityGroupId
        });
        new CfnOutput(this, 'DatabaseEndpoint', {
            exportName: id + ":DatabaseEndpoint",
            value: this.database.dbInstanceEndpointAddress
        });
        new CfnOutput(this, 'DatabasePort', {
            exportName: id + ":DatabasePort",
            value: this.database.dbInstanceEndpointPort
        });
        new CfnOutput(this, 'DatabaseSecretArn', {
            exportName: id + ":DatabaseSecretArn",
            value: this.database?.secret?.secretArn || ""
        });
    }
}
