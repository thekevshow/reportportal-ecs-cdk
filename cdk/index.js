const { App: CoreApp } = require('aws-cdk-lib');
const { ReportPortalDatabaseStack, ReportPortalEcsFargateStack } = require('./stacks');

class App extends CoreApp {
    constructor(argv) {
        super(argv);

        // ReportPortal Deployment //
        const reportPortalDatabaseStack = new ReportPortalDatabaseStack(this, 'ReportPortalDatabaseStack', {});
        const reportPortalEcsFargateStack = new ReportPortalEcsFargateStack(this, 'ReportPortalEcsFargateStack', {
            databaseStack: reportPortalDatabaseStack
        });
        reportPortalEcsFargateStack.addDependency(reportPortalDatabaseStack);
    }
}
new App(process.argv).synth();