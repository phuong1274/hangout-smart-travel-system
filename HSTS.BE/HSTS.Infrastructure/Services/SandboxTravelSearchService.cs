using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class SandboxTravelSearchService : ISandboxTravelSearchService
    {
        private readonly HttpClient _httpClient;
        private readonly SandboxTravelApiSettings _settings;
        private readonly ILogger<SandboxTravelSearchService> _logger;

        public SandboxTravelSearchService(
            HttpClient httpClient,
            IOptions<SandboxTravelApiSettings> settings,
            ILogger<SandboxTravelSearchService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<SandboxTravelSearchResult> SearchAsync(
            SandboxTravelSearchRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.EndpointPath))
            {
                return new SandboxTravelSearchResult(
                    false,
                    null,
                    "Sandbox endpoint path is not configured.",
                    "sandbox-api");
            }

            var endpoint = BuildUrl(_settings.EndpointPath, new Dictionary<string, string>
            {
                ["from"] = request.From,
                ["to"] = request.To,
                ["departDate"] = request.DepartDate.ToString("yyyy-MM-dd"),
                ["returnDate"] = request.ReturnDate?.ToString("yyyy-MM-dd") ?? string.Empty,
                ["cabin"] = request.Cabin,
                ["adults"] = request.Adults.ToString(),
                ["children"] = request.Children.ToString(),
                ["infants"] = request.Infants.ToString(),
                ["page"] = request.Page.ToString(),
                ["pagesize"] = request.PageSize.ToString()
            });

            using var message = new HttpRequestMessage(HttpMethod.Get, endpoint);
            if (!string.IsNullOrWhiteSpace(_settings.ApiKeyHeaderName) && !string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                message.Headers.Remove(_settings.ApiKeyHeaderName);
                message.Headers.Add(_settings.ApiKeyHeaderName, _settings.ApiKey);
            }

            try
            {
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "Sandbox travel API request failed with status {StatusCode}.",
                        (int)response.StatusCode);

                    return new SandboxTravelSearchResult(
                        false,
                        content,
                        $"Sandbox API returned status {(int)response.StatusCode}.",
                        "sandbox-api");
                }

                return new SandboxTravelSearchResult(
                    true,
                    content,
                    null,
                    "sandbox-api");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Sandbox travel API request failed.");
                return new SandboxTravelSearchResult(
                    false,
                    null,
                    "Sandbox API request failed. Please verify URL/API key.",
                    "sandbox-api");
            }
        }

        private static string BuildUrl(string endpointPath, IDictionary<string, string> query)
        {
            var endpoint = endpointPath.TrimStart('/');
            var queryString = string.Join("&", query
                .Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

            return string.IsNullOrWhiteSpace(queryString)
                ? endpoint
                : $"{endpoint}?{queryString}";
        }
    }
}
