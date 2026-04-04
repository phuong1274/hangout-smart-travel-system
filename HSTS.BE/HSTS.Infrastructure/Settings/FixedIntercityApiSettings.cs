namespace HSTS.Infrastructure.Settings
{
    public class FixedIntercityApiSettings
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string BusEndpointPath { get; set; } = "transport/bus";
        public string TrainEndpointPath { get; set; } = "transport/train";
        public string TrainMonthlyCountEndpointPath { get; set; } = "transport/train/calendar-count";
        public string PlaneEndpointPath { get; set; } = "transport/plane";
        public string PlaneMonthlyCountEndpointPath { get; set; } = "transport/plane/calendar-count";
        public string ApiKey { get; set; } = string.Empty;
        public string ApiKeyHeaderName { get; set; } = "X-API-Key";
    }
}
