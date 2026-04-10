namespace HSTS.Infrastructure.Settings
{
    public class SandboxTravelApiSettings
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string EndpointPath { get; set; } = "search";
        public string ApiKey { get; set; } = string.Empty;
        public string ApiKeyHeaderName { get; set; } = "X-API-Key";
    }
}
