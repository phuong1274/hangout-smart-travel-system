using HSTS.Application.Auth.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class EmailDomainPolicy : IEmailDomainPolicy
    {
        private readonly HashSet<string> _allowedDomains;
        private readonly bool _allowVnDomains;

        public EmailDomainPolicy(IOptions<EmailPolicySettings> settings)
        {
            var configuredDomains = settings.Value.AllowedDomains ?? new List<string>();
            _allowedDomains = configuredDomains
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .Select(NormalizeDomain)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            _allowVnDomains = settings.Value.AllowVnDomains;
        }

        public bool IsAllowedEmail(string email)
        {
            var domain = ExtractDomain(email);
            if (string.IsNullOrWhiteSpace(domain))
                return false;

            if (_allowVnDomains && domain.EndsWith(".vn", StringComparison.OrdinalIgnoreCase))
                return true;

            return _allowedDomains.Contains(domain);
        }

        private static string ExtractDomain(string email)
        {
            var atIndex = email.LastIndexOf('@');
            if (atIndex < 0 || atIndex == email.Length - 1)
                return string.Empty;

            return NormalizeDomain(email[(atIndex + 1)..]);
        }

        private static string NormalizeDomain(string domain) => domain.Trim().Trim('.').ToLowerInvariant();
    }
}
