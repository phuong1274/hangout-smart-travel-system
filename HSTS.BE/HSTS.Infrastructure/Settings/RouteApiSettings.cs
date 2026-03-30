namespace HSTS.Infrastructure.Settings
{
    public class RouteApiSettings
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string EndpointPath { get; set; } = "route";
        public string ApiKey { get; set; } = string.Empty;
        public string ApiKeyHeaderName { get; set; } = "X-API-Key";
    }
}
