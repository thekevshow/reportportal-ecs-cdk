const services = require('./services');

module.exports = class ReportPortalCoreService {
    /**
     * @param {*} scope 
     * @param {*} props --> { databaseStack, cluster, albSecurityGroup, fargateSecurityGroup } = props;
     *                      { database } = databaseStack;
     */
    constructor(scope, props) {
        // data related container services
        this.openSearchService = new services.ReportPortalOpenSearchService(scope, props);

        // core related services
        this.rabbitMQService = new services.RabbitMQService(scope, props);
        this.reportPortalAnalyzerTrainService = new services.ReportPortalAnalyzerTrainService(scope, props);
        this.reportPortalMetricsGathererService = new services.ReportPortalMetricsGathererService(scope, props);
        this.reportPortalServiceIndexService = new services.ReportPortalServiceIndexService(scope, props);
        this.reportPortalJobsService = new services.ReportPortalJobsService(scope, props);
        this.reportPortalServiceAnalyzerService = new services.ReportPortalServiceAnalyzerService(scope, props);
        this.reportportalUATService = new services.ReportPortalUATService(scope, props);
        this.reportPortalApiService = new services.ReportPortalApiService(scope, props);

        // // ui related services
        this.reportPortalUIService = new services.ReportPortalUIService(scope, props);
        this.traefikService = new services.TraefikService(scope, props);
    }
}