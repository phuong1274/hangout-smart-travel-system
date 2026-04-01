namespace HSTS.Infrastructure.Settings
{
    public class ExchangeRateSettings
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public int CacheMinutes { get; set; } = 60;
    }
}
