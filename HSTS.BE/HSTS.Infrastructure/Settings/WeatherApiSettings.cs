namespace HSTS.Infrastructure.Settings
{
    public class WeatherApiSettings
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string EndpointPath { get; set; } = "weather";
        public string ApiKey { get; set; } = string.Empty;
        public string ApiKeyHeaderName { get; set; } = "X-API-Key";
    }
}
