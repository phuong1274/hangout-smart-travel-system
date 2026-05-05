using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class ClientAppUrlProvider : IClientAppUrlProvider
    {
        private const string DevelopmentBaseUrl = "http://localhost:5173";
        private readonly ClientAppSettings _settings;

        public ClientAppUrlProvider(IOptions<ClientAppSettings> settings)
        {
            _settings = settings.Value;
        }

        public string BaseUrl
        {
            get
            {
                var configuredBaseUrl = _settings.BaseUrl?.Trim().TrimEnd('/');
                if (!string.IsNullOrWhiteSpace(configuredBaseUrl))
                {
                    if (!Uri.TryCreate(configuredBaseUrl, UriKind.Absolute, out var configuredUri))
                        throw new InvalidOperationException("ClientApp:BaseUrl must be an absolute URL.");

                    return configuredUri.ToString().TrimEnd('/');
                }

                if (IsDevelopment())
                    return DevelopmentBaseUrl;

                throw new InvalidOperationException("ClientApp:BaseUrl is not configured.");
            }
        }

        public string BuildUrl(string path, IReadOnlyDictionary<string, string?> queryParameters)
        {
            var normalizedPath = path.StartsWith('/') ? path : $"/{path}";
            var builder = new UriBuilder($"{BaseUrl}{normalizedPath}");

            if (queryParameters.Count > 0)
            {
                builder.Query = string.Join(
                    "&",
                    queryParameters
                        .Where(x => x.Value is not null)
                        .Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value!)}"));
            }

            return builder.Uri.ToString();
        }

        private static bool IsDevelopment()
        {
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");

            return string.Equals(environment, "Development", StringComparison.OrdinalIgnoreCase);
        }
    }
}
