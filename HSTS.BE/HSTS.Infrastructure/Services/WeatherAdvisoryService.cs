using System.Text.Json;
using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class WeatherAdvisoryService : IWeatherAdvisoryService
    {
        private readonly HttpClient _httpClient;
        private readonly WeatherApiSettings _settings;
        private readonly ILogger<WeatherAdvisoryService> _logger;

        public WeatherAdvisoryService(
            HttpClient httpClient,
            IOptions<WeatherApiSettings> settings,
            ILogger<WeatherAdvisoryService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<WeatherAdvice?> GetAdviceAsync(
            string location,
            DateOnly date,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.EndpointPath))
            {
                return null;
            }

            var endpoint = BuildUrl(_settings.EndpointPath, new Dictionary<string, string>
            {
                ["location"] = location,
                ["date"] = date.ToString("yyyy-MM-dd")
            });

            using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
            if (!string.IsNullOrWhiteSpace(_settings.ApiKeyHeaderName) && !string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                request.Headers.Remove(_settings.ApiKeyHeaderName);
                request.Headers.Add(_settings.ApiKeyHeaderName, _settings.ApiKey);
            }

            try
            {
                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Weather API request failed with status {StatusCode}.", (int)response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(content);
                return ParseWeather(document.RootElement);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Weather API request failed and weather advice is skipped.");
                return null;
            }
        }

        private static WeatherAdvice? ParseWeather(JsonElement root)
        {
            var summary = TryGetString(root, "summary")
                ?? TryGetString(root, "description")
                ?? TryGetString(root, "weather")
                ?? TryGetString(root, "condition")
                ?? TryGetString(root, "text");

            if (string.IsNullOrWhiteSpace(summary))
            {
                return null;
            }

            var lowered = summary.ToLowerInvariant();
            var isOutdoorFriendly =
                !lowered.Contains("storm") &&
                !lowered.Contains("thunder") &&
                !lowered.Contains("heavy rain") &&
                !lowered.Contains("mua") &&
                !lowered.Contains("bao");

            return new WeatherAdvice(summary, isOutdoorFriendly, "external-weather-api");
        }

        private static string? TryGetString(JsonElement element, string key)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (property.Name.Equals(key, StringComparison.OrdinalIgnoreCase))
                    {
                        return property.Value.ValueKind == JsonValueKind.String
                            ? property.Value.GetString()
                            : property.Value.ToString();
                    }

                    var nested = TryGetString(property.Value, key);
                    if (nested is not null)
                    {
                        return nested;
                    }
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.EnumerateArray())
                {
                    var nested = TryGetString(item, key);
                    if (nested is not null)
                    {
                        return nested;
                    }
                }
            }

            return null;
        }

        private static string BuildUrl(string endpointPath, IDictionary<string, string> query)
        {
            var endpoint = endpointPath.TrimStart('/');
            var queryString = string.Join("&", query.Select(kv =>
                $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

            return string.IsNullOrWhiteSpace(queryString)
                ? endpoint
                : $"{endpoint}?{queryString}";
        }
    }
}
