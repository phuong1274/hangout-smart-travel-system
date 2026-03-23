namespace HSTS.Infrastructure.Settings
{
    public class ResendSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string FromEmail { get; set; } = string.Empty;
        public string FromName { get; set; } = "Hangout - Smart Travel System";
    }
}
