namespace HSTS.Infrastructure.Settings
{
    public class WeatherApiSettings
    {
        public string Provider { get; set; } = "Generic";
        public string BaseUrl { get; set; } = string.Empty;
        public string EndpointPath { get; set; } = "weather";
        public string DefaultQueryString { get; set; } = string.Empty;
        public string GeocodingBaseUrl { get; set; } = string.Empty;
        public string GeocodingEndpointPath { get; set; } = "v1/search";
        public string ApiKey { get; set; } = string.Empty;
        public string ApiKeyHeaderName { get; set; } = "X-API-Key";
    }
}
