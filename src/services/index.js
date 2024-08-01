const RabbitMQService = require('./RabbitMQService');
const ReportPortalOpenSearchService = require('./ReportPortalOpenSearchService');
const ReportPortalAnalyzerTrainService = require('./ReportPortalAnalyzerTrainService')
const ReportPortalApiService = require('./ReportPortalApiService')
const ReportPortalJobsService = require('./ReportPortalJobsService')
const ReportPortalMetricsGathererService = require('./ReportPortalMetricsGathererService')
const ReportPortalServiceAnalyzerService = require('./ReportPortalServiceAnalyzerService')
const ReportPortalUIService = require('./ReportPortalUIService')
const TraefikService = require('./TraefikService')
const ReportPortalServiceIndexService = require('./ReportPortalServiceIndexService');
const ReportPortalUATService = require('./ReportPortalUATService');
module.exports = {
    RabbitMQService,
    ReportPortalAnalyzerTrainService,
    ReportPortalOpenSearchService,
    ReportPortalApiService,
    ReportPortalJobsService,
    ReportPortalMetricsGathererService,
    ReportPortalServiceAnalyzerService,
    ReportPortalUIService,
    TraefikService,
    ReportPortalServiceIndexService,
    ReportPortalUATService
}