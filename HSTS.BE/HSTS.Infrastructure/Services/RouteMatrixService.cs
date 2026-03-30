using System.Globalization;
using System.Text.Json;
using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class RouteMatrixService : IRouteMatrixService
    {
        private const string OsrmProvider = "OSRM";

        private static readonly HashSet<string> DistanceKmKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "distancekm", "distance_km", "distanceinkm", "km"
        };

        private static readonly HashSet<string> DistanceMeterKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "distancemeters", "distance_meters", "distanceinmeters", "meters"
        };

        private static readonly HashSet<string> DistanceGenericKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "distance"
        };

        private static readonly HashSet<string> DurationMinuteKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "durationminutes", "duration_minutes", "traveltimeminutes", "eta_minutes"
        };

        private static readonly HashSet<string> DurationSecondKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "durationseconds", "duration_seconds", "traveltimeseconds"
        };

        private static readonly HashSet<string> DurationGenericKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "duration", "eta"
        };

        private readonly HttpClient _httpClient;
        private readonly RouteApiSettings _settings;
        private readonly ILogger<RouteMatrixService> _logger;

        public RouteMatrixService(
            HttpClient httpClient,
            IOptions<RouteApiSettings> settings,
            ILogger<RouteMatrixService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        public Task<RouteEstimate?> EstimateAsync(
            string from,
            string to,
            CancellationToken cancellationToken = default)
        {
            if (IsOsrmProvider())
            {
                return Task.FromResult<RouteEstimate?>(null);
            }

            var query = new Dictionary<string, string>
            {
                ["from"] = from,
                ["to"] = to
            };

            return EstimateInternalAsync(query, cancellationToken);
        }

        public Task<RouteEstimate?> EstimateAsync(
            double fromLatitude,
            double fromLongitude,
            double toLatitude,
            double toLongitude,
            CancellationToken cancellationToken = default)
        {
            if (IsOsrmProvider())
            {
                return EstimateOsrmAsync(fromLatitude, fromLongitude, toLatitude, toLongitude, cancellationToken);
            }

            var query = new Dictionary<string, string>
            {
                ["fromLat"] = fromLatitude.ToString(CultureInfo.InvariantCulture),
                ["fromLng"] = fromLongitude.ToString(CultureInfo.InvariantCulture),
                ["toLat"] = toLatitude.ToString(CultureInfo.InvariantCulture),
                ["toLng"] = toLongitude.ToString(CultureInfo.InvariantCulture)
            };

            return EstimateInternalAsync(query, cancellationToken);
        }

        private async Task<RouteEstimate?> EstimateOsrmAsync(
            double fromLatitude,
            double fromLongitude,
            double toLatitude,
            double toLongitude,
            CancellationToken cancellationToken)
        {
            var endpointPath = string.IsNullOrWhiteSpace(_settings.EndpointPath)
                ? "route/v1/driving"
                : _settings.EndpointPath;

            var fromCoordinate = string.Create(
                CultureInfo.InvariantCulture,
                $"{fromLongitude},{fromLatitude}");
            var toCoordinate = string.Create(
                CultureInfo.InvariantCulture,
                $"{toLongitude},{toLatitude}");

            var queryString = string.IsNullOrWhiteSpace(_settings.DefaultQueryString)
                ? "overview=false"
                : _settings.DefaultQueryString.TrimStart('?');

            var endpoint = $"{endpointPath.TrimStart('/')}/{fromCoordinate};{toCoordinate}?{queryString}";
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
                    _logger.LogWarning("OSRM route request failed with status {StatusCode}.", (int)response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(content);
                return ParseOsrmRouteEstimate(document.RootElement);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OSRM route request failed and fallback will be used.");
                return null;
            }
        }

        private async Task<RouteEstimate?> EstimateInternalAsync(
            IDictionary<string, string> query,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(_settings.EndpointPath))
            {
                return null;
            }

            var endpoint = BuildUrl(_settings.EndpointPath, query);
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
                    _logger.LogWarning("Route API request failed with status {StatusCode}.", (int)response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                using var document = JsonDocument.Parse(content);
                return ParseRouteEstimate(document.RootElement);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Route API request failed and fallback will be used.");
                return null;
            }
        }

        private static RouteEstimate? ParseRouteEstimate(JsonElement root)
        {
            var distanceKm = 0d;
            if (TryGetDouble(root, DistanceKmKeys, out var km))
            {
                distanceKm = km;
            }
            else if (TryGetDouble(root, DistanceMeterKeys, out var meters))
            {
                distanceKm = meters / 1000d;
            }
            else if (TryGetDouble(root, DistanceGenericKeys, out var genericDistance))
            {
                distanceKm = genericDistance > 1000d ? genericDistance / 1000d : genericDistance;
            }

            var durationMinutes = 0;
            if (TryGetDouble(root, DurationMinuteKeys, out var minutes))
            {
                durationMinutes = (int)Math.Round(minutes);
            }
            else if (TryGetDouble(root, DurationSecondKeys, out var seconds))
            {
                durationMinutes = Math.Max(1, (int)Math.Round(seconds / 60d));
            }
            else if (TryGetDouble(root, DurationGenericKeys, out var genericDuration))
            {
                durationMinutes = genericDuration > 1000
                    ? Math.Max(1, (int)Math.Round(genericDuration / 60d))
                    : Math.Max(1, (int)Math.Round(genericDuration));
            }

            if (distanceKm <= 0 || durationMinutes <= 0)
            {
                return null;
            }

            return new RouteEstimate(distanceKm, durationMinutes, "external-route-api");
        }

        private static RouteEstimate? ParseOsrmRouteEstimate(JsonElement root)
        {
            if (root.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (root.TryGetProperty("code", out var codeElement) &&
                codeElement.ValueKind == JsonValueKind.String &&
                !string.Equals(codeElement.GetString(), "Ok", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            if (!root.TryGetProperty("routes", out var routesElement) ||
                routesElement.ValueKind != JsonValueKind.Array ||
                routesElement.GetArrayLength() == 0)
            {
                return null;
            }

            var firstRoute = routesElement[0];
            if (!firstRoute.TryGetProperty("distance", out var distanceElement) ||
                !TryReadDouble(distanceElement, out var distanceMeters) ||
                distanceMeters <= 0)
            {
                return null;
            }

            if (!firstRoute.TryGetProperty("duration", out var durationElement) ||
                !TryReadDouble(durationElement, out var durationSeconds) ||
                durationSeconds <= 0)
            {
                return null;
            }

            return new RouteEstimate(
                distanceMeters / 1000d,
                Math.Max(1, (int)Math.Round(durationSeconds / 60d)),
                "osrm");
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

        private static bool TryGetDouble(JsonElement root, HashSet<string> keys, out double value)
        {
            if (TryFindProperty(root, keys, out var element))
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
            }

            value = 0;
            return false;
        }

        private static bool TryFindProperty(JsonElement element, HashSet<string> keys, out JsonElement found)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (keys.Contains(property.Name))
                    {
                        found = property.Value;
                        return true;
                    }

                    if (TryFindProperty(property.Value, keys, out found))
                    {
                        return true;
                    }
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.EnumerateArray())
                {
                    if (TryFindProperty(item, keys, out found))
                    {
                        return true;
                    }
                }
            }

            found = default;
            return false;
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

        private bool IsOsrmProvider()
        {
            return string.Equals(_settings.Provider, OsrmProvider, StringComparison.OrdinalIgnoreCase);
        }
    }
}
