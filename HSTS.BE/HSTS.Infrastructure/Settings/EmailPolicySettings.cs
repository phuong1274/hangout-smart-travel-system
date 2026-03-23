namespace HSTS.Infrastructure.Settings
{
    public class EmailPolicySettings
    {
        public List<string> AllowedDomains { get; set; } = new();
        public bool AllowVnDomains { get; set; } = true;
    }
}
