using System.Text.RegularExpressions;
using ErrorOr;
using FluentValidation;
using MediatR;

namespace HSTS.Application.Maps
{
    public record ResolveMapLinkQuery(string Url) : IRequest<ErrorOr<MapLinkResult>>;

    public record MapLinkResult(double? Latitude, double? Longitude, string? Address, string? Name);

    public class ResolveMapLinkQueryHandler : IRequestHandler<ResolveMapLinkQuery, ErrorOr<MapLinkResult>>
    {
        private static readonly HashSet<string> AllowedHosts = new(StringComparer.OrdinalIgnoreCase)
        {
            "maps.apple.com",
            "maps.google.com",
            "www.google.com",
            "google.com",
            "maps.app.goo.gl",
            "goo.gl",
        };

        public async Task<ErrorOr<MapLinkResult>> Handle(ResolveMapLinkQuery request, CancellationToken ct)
        {
            // Validate host is a known map provider
            if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var inputUri))
                return Error.Failure("InvalidUrl", "Invalid URL format");

            if (!AllowedHosts.Contains(inputUri.Host))
                return Error.Failure("UnsupportedProvider", $"Map provider '{inputUri.Host}' is not supported");

            var merged = new MapLinkResultBuilder();

            // 1. Parse the input URL directly (Apple Maps, Google full URL)
            var directResult = ParseUrl(request.Url);
            if (directResult != null)
                merged.Merge(directResult);

            // 2. If short link, follow the full redirect chain and parse each hop
            if (IsShortLink(request.Url))
            {
                try
                {
                    var handler = new HttpClientHandler { AllowAutoRedirect = false };
                    using var client = new HttpClient(handler);
                    client.Timeout = TimeSpan.FromSeconds(5);
                    client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

                    var currentUrl = request.Url;
                    const int maxRedirects = 5;

                    for (var i = 0; i < maxRedirects; i++)
                    {
                        using var response = await client.GetAsync(currentUrl, ct);
                        var location = response.Headers.Location;

                        var isRedirect = response.StatusCode is System.Net.HttpStatusCode.Redirect
                            or System.Net.HttpStatusCode.MovedPermanently
                            or System.Net.HttpStatusCode.Found
                            or System.Net.HttpStatusCode.TemporaryRedirect
                            or System.Net.HttpStatusCode.PermanentRedirect;

                        if (location == null || !isRedirect)
                            break;

                        if (!location.IsAbsoluteUri)
                            location = new Uri(new Uri(currentUrl), location);

                        if (!AllowedHosts.Contains(location.Host))
                            break;

                        // Parse each intermediate URL for data
                        var hopResult = ParseUrl(location.ToString());
                        if (hopResult != null)
                            merged.Merge(hopResult);

                        currentUrl = location.ToString();
                    }
                }
                catch (TaskCanceledException) { /* timeout */ }
                catch (HttpRequestException) { /* network error */ }
            }

            // 3. Return merged result (may be partial)
            var result = merged.Build();
            if (result.Latitude == null && result.Address == null && result.Name == null)
                return directResult ?? new MapLinkResult(null, null, null, null);

            return result;
        }

        private static bool IsShortLink(string url) =>
            Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Host.Equals("maps.app.goo.gl", StringComparison.OrdinalIgnoreCase)
                || uri.Host.Equals("goo.gl", StringComparison.OrdinalIgnoreCase));

        private static MapLinkResult? ParseUrl(string url)
        {
            var appleResult = ParseAppleMapsUrl(url);
            if (appleResult?.Latitude != null) return appleResult;

            var googleResult = ParseGoogleMapsUrl(url);
            return googleResult ?? appleResult;
        }

        private static MapLinkResult? ParseAppleMapsUrl(string url)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
                || !uri.Host.Equals("maps.apple.com", StringComparison.OrdinalIgnoreCase))
                return null;

            try
            {
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);

                double? lat = null;
                double? lng = null;

                var coord = query["coordinate"];
                if (!string.IsNullOrEmpty(coord))
                {
                    var parts = coord.Split(',');
                    if (parts.Length == 2 &&
                        double.TryParse(parts[0], out var latitude) &&
                        double.TryParse(parts[1], out var longitude))
                    {
                        lat = latitude;
                        lng = longitude;
                    }
                }

                return new MapLinkResult(lat, lng, query["address"], query["name"]);
            }
            catch
            {
                return null;
            }
        }

        private static MapLinkResult? ParseGoogleMapsUrl(string url)
        {
            if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
                return null;

            var host = uri.Host.ToLowerInvariant();
            if (host != "maps.google.com" && host != "www.google.com" && host != "google.com")
                return null;

            try
            {
                double? lat = null;
                double? lng = null;

                // Extract coordinates from @lat,lng pattern (supports integer and decimal)
                var coordMatch = Regex.Match(uri.PathAndQuery, @"@(-?\d+\.?\d*),(-?\d+\.?\d*)");
                if (coordMatch.Success)
                {
                    if (double.TryParse(coordMatch.Groups[1].Value, out var latitude))
                        lat = latitude;
                    if (double.TryParse(coordMatch.Groups[2].Value, out var longitude))
                        lng = longitude;
                }

                // Extract place name from /place/ segment
                string? name = null;
                var placeMatch = Regex.Match(uri.PathAndQuery, @"/place/([^/@]+)");
                if (placeMatch.Success)
                {
                    name = System.Web.HttpUtility.UrlDecode(placeMatch.Groups[1].Value).Replace("+", " ");
                }

                // Extract address from q parameter
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                var address = query["q"];

                // Fallback: data= segment !3d{lat}!4d{lng}
                if (lat == null || lng == null)
                {
                    var data = query["data"];
                    if (!string.IsNullOrEmpty(data))
                    {
                        var latMatch = Regex.Match(data, @"!3d(-?\d+\.?\d*)");
                        var lngMatch = Regex.Match(data, @"!4d(-?\d+\.?\d*)");
                        if (latMatch.Success && double.TryParse(latMatch.Groups[1].Value, out var dataLat))
                            lat = dataLat;
                        if (lngMatch.Success && double.TryParse(lngMatch.Groups[1].Value, out var dataLng))
                            lng = dataLng;
                    }
                }

                return new MapLinkResult(lat, lng, address, name);
            }
            catch
            {
                return null;
            }
        }
    }

    internal class MapLinkResultBuilder
    {
        private double? _lat;
        private double? _lng;
        private string? _address;
        private string? _name;

        public void Merge(MapLinkResult result)
        {
            if (result.Latitude.HasValue && !_lat.HasValue) _lat = result.Latitude;
            if (result.Longitude.HasValue && !_lng.HasValue) _lng = result.Longitude;
            if (!string.IsNullOrEmpty(result.Address) && string.IsNullOrEmpty(_address)) _address = result.Address;
            if (!string.IsNullOrEmpty(result.Name) && string.IsNullOrEmpty(_name)) _name = result.Name;
        }

        public MapLinkResult Build() => new(_lat, _lng, _address, _name);
    }

    public class ResolveMapLinkQueryValidator : AbstractValidator<ResolveMapLinkQuery>
    {
        public ResolveMapLinkQueryValidator()
        {
            RuleFor(x => x.Url).NotEmpty().WithMessage("URL is required");
            RuleFor(x => x.Url).Must(BeAValidUrl).WithMessage("Invalid URL format");
        }

        private static bool BeAValidUrl(string url) =>
            Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
            && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
    }
}
