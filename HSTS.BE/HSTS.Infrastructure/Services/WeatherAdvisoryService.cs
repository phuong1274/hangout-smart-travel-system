using System.Globalization;
using System.Text.Json;
using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class WeatherAdvisoryService : IWeatherAdvisoryService
    {
        private const string OpenMeteoProvider = "OpenMeteo";

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
            if (IsOpenMeteoProvider())
            {
                return await GetOpenMeteoAdviceAsync(location, date, cancellationToken);
            }

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

        private async Task<WeatherAdvice?> GetOpenMeteoAdviceAsync(
            string location,
            DateOnly date,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(location) || string.IsNullOrWhiteSpace(_settings.EndpointPath))
            {
                return null;
            }

            var coordinate = await ResolveCoordinateAsync(location, cancellationToken);
            if (coordinate is null)
            {
                _logger.LogInformation("Open-Meteo geocoding returned no result for location {Location}.", location);
                return null;
            }

            var endpoint = BuildUrl(_settings.EndpointPath, new Dictionary<string, string>
            {
                ["latitude"] = coordinate.Latitude.ToString(CultureInfo.InvariantCulture),
                ["longitude"] = coordinate.Longitude.ToString(CultureInfo.InvariantCulture),
                ["start_date"] = date.ToString("yyyy-MM-dd"),
                ["end_date"] = date.ToString("yyyy-MM-dd")
            });

            endpoint = AppendRawQuery(
                endpoint,
                string.IsNullOrWhiteSpace(_settings.DefaultQueryString)
                    ? "daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"
                    : _settings.DefaultQueryString);

            var targetUri = BuildAbsoluteUri(_settings.BaseUrl, endpoint);
            using var request = new HttpRequestMessage(HttpMethod.Get, targetUri);

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
                    _logger.LogWarning("Open-Meteo forecast request failed with status {StatusCode}.", (int)response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(content);
                return ParseOpenMeteoWeather(document.RootElement, date);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Open-Meteo forecast request failed and weather advice is skipped.");
                return null;
            }
        }

        private async Task<WeatherCoordinate?> ResolveCoordinateAsync(
            string location,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(_settings.GeocodingEndpointPath))
            {
                return null;
            }

            var endpoint = BuildUrl(_settings.GeocodingEndpointPath, new Dictionary<string, string>
            {
                ["name"] = location,
                ["count"] = "1",
                ["language"] = "en",
                ["format"] = "json"
            });

            var geocodingBaseUrl = string.IsNullOrWhiteSpace(_settings.GeocodingBaseUrl)
                ? "https://geocoding-api.open-meteo.com/"
                : _settings.GeocodingBaseUrl;
            var targetUri = BuildAbsoluteUri(geocodingBaseUrl, endpoint);

            using var request = new HttpRequestMessage(HttpMethod.Get, targetUri);

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
                    _logger.LogWarning("Open-Meteo geocoding request failed with status {StatusCode}.", (int)response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(content);

                if (!document.RootElement.TryGetProperty("results", out var resultsElement) ||
                    resultsElement.ValueKind != JsonValueKind.Array ||
                    resultsElement.GetArrayLength() == 0)
                {
                    return null;
                }

                var first = resultsElement[0];
                if (!TryGetDouble(first, "latitude", out var latitude) ||
                    !TryGetDouble(first, "longitude", out var longitude))
                {
                    return null;
                }

                var name = TryGetString(first, "name") ?? location;
                return new WeatherCoordinate(name, latitude, longitude);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Open-Meteo geocoding request failed and weather advice is skipped.");
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

        private static WeatherAdvice? ParseOpenMeteoWeather(JsonElement root, DateOnly targetDate)
        {
            if (!root.TryGetProperty("daily", out var dailyElement) ||
                dailyElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (!dailyElement.TryGetProperty("time", out var timeElement) ||
                timeElement.ValueKind != JsonValueKind.Array ||
                timeElement.GetArrayLength() == 0)
            {
                return null;
            }

            var targetDateString = targetDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var targetIndex = 0;
            for (var index = 0; index < timeElement.GetArrayLength(); index++)
            {
                if (timeElement[index].ValueKind == JsonValueKind.String &&
                    string.Equals(timeElement[index].GetString(), targetDateString, StringComparison.Ordinal))
                {
                    targetIndex = index;
                    break;
                }
            }

            if (!TryGetArrayDouble(dailyElement, "weather_code", targetIndex, out var weatherCodeRaw))
            {
                return null;
            }

            var weatherCode = (int)Math.Round(weatherCodeRaw);
            var hasMinTemperature = TryGetArrayDouble(dailyElement, "temperature_2m_min", targetIndex, out var minTemperature);
            var hasMaxTemperature = TryGetArrayDouble(dailyElement, "temperature_2m_max", targetIndex, out var maxTemperature);

            var summary = DescribeWeatherCode(weatherCode);
            if (hasMinTemperature && hasMaxTemperature)
            {
                summary = string.Create(
                    CultureInfo.InvariantCulture,
                    $"{summary}, {minTemperature:0.#} to {maxTemperature:0.#} C");
            }

            return new WeatherAdvice(summary, IsOutdoorFriendly(weatherCode), "open-meteo");
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

        private static bool TryGetDouble(JsonElement element, string key, out double value)
        {
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(key, out var valueElement))
            {
                return TryReadDouble(valueElement, out value);
            }

            value = 0;
            return false;
        }

        private static bool TryGetArrayDouble(JsonElement element, string key, int index, out double value)
        {
            if (!element.TryGetProperty(key, out var arrayElement) ||
                arrayElement.ValueKind != JsonValueKind.Array ||
                arrayElement.GetArrayLength() <= index ||
                index < 0)
            {
                value = 0;
                return false;
            }

            return TryReadDouble(arrayElement[index], out value);
        }

        private static bool TryReadDouble(JsonElement element, out double value)
        {
            if (element.ValueKind == JsonValueKind.Number && element.TryGetDouble(out value))
            {
                return true;
            }

            if (element.ValueKind == JsonValueKind.String &&
                double.TryParse(element.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out value))
            {
                return true;
            }

            value = 0;
            return false;
        }

        private static string DescribeWeatherCode(int weatherCode)
        {
            return weatherCode switch
            {
                0 => "Clear sky",
                1 => "Mainly clear",
                2 => "Partly cloudy",
                3 => "Overcast",
                45 => "Fog",
                48 => "Rime fog",
                51 => "Light drizzle",
                53 => "Moderate drizzle",
                55 => "Dense drizzle",
                56 => "Light freezing drizzle",
                57 => "Dense freezing drizzle",
                61 => "Slight rain",
                63 => "Moderate rain",
                65 => "Heavy rain",
                66 => "Light freezing rain",
                67 => "Heavy freezing rain",
                71 => "Slight snow",
                73 => "Moderate snow",
                75 => "Heavy snow",
                77 => "Snow grains",
                80 => "Slight rain showers",
                81 => "Moderate rain showers",
                82 => "Violent rain showers",
                85 => "Slight snow showers",
                86 => "Heavy snow showers",
                95 => "Thunderstorm",
                96 => "Thunderstorm with slight hail",
                99 => "Thunderstorm with heavy hail",
                _ => "Unknown weather"
            };
        }

        private static bool IsOutdoorFriendly(int weatherCode)
        {
            return weatherCode is 0 or 1 or 2 or 3;
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

        private static string AppendRawQuery(string url, string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return url;
            }

            var normalized = query.TrimStart('?');
            return url.Contains('?', StringComparison.Ordinal)
                ? $"{url}&{normalized}"
                : $"{url}?{normalized}";
        }

        private static string BuildAbsoluteUri(string baseUrl, string endpointOrAbsolute)
        {
            if (Uri.TryCreate(endpointOrAbsolute, UriKind.Absolute, out var absoluteUri))
            {
                return absoluteUri.ToString();
            }

            if (Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri))
            {
                return new Uri(baseUri, endpointOrAbsolute.TrimStart('/')).ToString();
            }

            return endpointOrAbsolute;
        }

        private bool IsOpenMeteoProvider()
        {
            return string.Equals(_settings.Provider, OpenMeteoProvider, StringComparison.OrdinalIgnoreCase);
        }

        private sealed record WeatherCoordinate(
            string Name,
            double Latitude,
            double Longitude);
    }
}
