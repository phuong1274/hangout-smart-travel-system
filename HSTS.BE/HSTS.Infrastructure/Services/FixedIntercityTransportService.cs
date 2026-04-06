using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class FixedIntercityTransportService : IFixedIntercityTransportService
    {
        private static readonly Regex StationCodeRegex = new("^[A-Z0-9]{2,10}$", RegexOptions.Compiled);
        private static readonly Regex IataAirportCodeRegex = new("^[A-Z]{3}$", RegexOptions.Compiled);
        private static readonly Regex YearMonthRegex = new("^[0-9]{4}-[0-9]{2}$", RegexOptions.Compiled);

        private static readonly HashSet<string> CostKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "totalprice", "total_price", "price", "cost", "amount", "ticketprice",
            "original", "min_price", "markupprice"
        };

        private static readonly HashSet<string> DurationMinuteKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "durationminutes", "duration_minutes", "traveltimeminutes", "eta_minutes"
        };

        private static readonly HashSet<string> DurationSecondKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "durationseconds", "duration_seconds", "traveltimeseconds", "eta_seconds"
        };

        private static readonly HashSet<string> DurationGenericKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "duration", "eta", "time"
        };

        private static readonly HashSet<string> MethodKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "busname", "trainname", "traincode", "name", "operatorname", "companyname", "transportname"
        };

        private static readonly HashSet<string> FlightMethodKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "flightname", "flightcode", "airline", "airlinename", "carrier", "name"
        };

        private static readonly HashSet<string> SupportedTrainSeatTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            TrainSeatTypes.HardSeat,
            TrainSeatTypes.SoftSeat,
            TrainSeatTypes.Sleeper4,
            TrainSeatTypes.Sleeper6
        };

        private static readonly HashSet<string> SupportedFlightCabins = new(StringComparer.OrdinalIgnoreCase)
        {
            FlightCabinTypes.Economy,
            FlightCabinTypes.PremiumEconomy,
            FlightCabinTypes.Business
        };

        private static readonly HashSet<string> IgnoredParsingKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            "baggages", "fare_rules", "pickup_points", "dropoff_points", "segments"
        };

        private readonly HttpClient _httpClient;
        private readonly FixedIntercityApiSettings _settings;
        private readonly ILogger<FixedIntercityTransportService> _logger;

        public FixedIntercityTransportService(
            HttpClient httpClient,
            IOptions<FixedIntercityApiSettings> settings,
            ILogger<FixedIntercityTransportService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<FixedIntercitySearchResult> SearchBusAsync(
            FixedIntercitySearchRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.BusEndpointPath))
            {
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-bus-api",
                    null,
                    null,
                    "Bus endpoint path is not configured.");
            }

            if (!TryValidateBusRequest(request, out var validationError))
            {
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-bus-api",
                    null,
                    null,
                    validationError);
            }

            var endpoint = BuildUrl(_settings.BusEndpointPath, BuildBusQuery(request));

            var targetUri = BuildAbsoluteUri(_settings.BaseUrl, endpoint);
            using var message = new HttpRequestMessage(HttpMethod.Get, targetUri);
            message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

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
                        "Bus API request failed with status {StatusCode}.",
                        (int)response.StatusCode);

                    return new FixedIntercitySearchResult(
                        false,
                        "fixed-intercity-bus-api",
                        null,
                        content,
                        $"Bus API returned status {(int)response.StatusCode}.");
                }

                using var document = JsonDocument.Parse(content);
                var parsed = ParseBusOption(document.RootElement);
                return new FixedIntercitySearchResult(
                    true,
                    "fixed-intercity-bus-api",
                    parsed,
                    content,
                    parsed is null ? "Bus API response was received but no supported fields were found." : null);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bus API request failed.");
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-bus-api",
                    null,
                    null,
                    "Bus API request failed. Please verify URL/API key and required query params.");
            }
        }

        public async Task<FixedIntercitySearchResult> SearchTrainAsync(
            TrainRouteSearchRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.TrainEndpointPath))
            {
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-train-api",
                    null,
                    null,
                    "Train endpoint path is not configured.");
            }

            if (!TryValidateTrainRouteRequest(request, out var validationError))
            {
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-train-api",
                    null,
                    null,
                    validationError);
            }

            var endpoint = BuildUrl(_settings.TrainEndpointPath, BuildTrainRouteQuery(request));
            var targetUri = BuildAbsoluteUri(_settings.BaseUrl, endpoint);
            using var message = CreateJsonGetRequest(targetUri);

            try
            {
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Train API request failed with status {StatusCode}.", (int)response.StatusCode);
                    return new FixedIntercitySearchResult(
                        false,
                        "fixed-intercity-train-api",
                        null,
                        content,
                        $"Train API returned status {(int)response.StatusCode}.");
                }

                using var document = JsonDocument.Parse(content);
                var parsed = ParseTrainOption(document.RootElement);
                return new FixedIntercitySearchResult(
                    true,
                    "fixed-intercity-train-api",
                    parsed,
                    content,
                    parsed is null ? "Train API response was received but no supported fields were found." : null);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Train API request failed.");
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-train-api",
                    null,
                    null,
                    "Train API request failed. Please verify URL/API key and train parameters.");
            }
        }

        public async Task<TrainMonthlyCalendarResult> GetTrainMonthlyCalendarAsync(
            TrainMonthlyCalendarRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.TrainMonthlyCountEndpointPath))
            {
                return new TrainMonthlyCalendarResult(
                    false,
                    "fixed-intercity-train-calendar-api",
                    null,
                    "Train monthly calendar endpoint path is not configured.");
            }

            if (!TryValidateTrainMonthlyRequest(request, out var validationError))
            {
                return new TrainMonthlyCalendarResult(
                    false,
                    "fixed-intercity-train-calendar-api",
                    null,
                    validationError);
            }

            var endpoint = BuildUrl(_settings.TrainMonthlyCountEndpointPath, BuildTrainMonthlyQuery(request));
            var targetUri = BuildAbsoluteUri(_settings.BaseUrl, endpoint);
            using var message = CreateJsonGetRequest(targetUri);

            try
            {
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Train monthly calendar API request failed with status {StatusCode}.", (int)response.StatusCode);
                    return new TrainMonthlyCalendarResult(
                        false,
                        "fixed-intercity-train-calendar-api",
                        content,
                        $"Train monthly calendar API returned status {(int)response.StatusCode}.");
                }

                return new TrainMonthlyCalendarResult(
                    true,
                    "fixed-intercity-train-calendar-api",
                    content,
                    null);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Train monthly calendar API request failed.");
                return new TrainMonthlyCalendarResult(
                    false,
                    "fixed-intercity-train-calendar-api",
                    null,
                    "Train monthly calendar API request failed. Please verify URL/API key and query parameters.");
            }
        }

        public async Task<FixedIntercitySearchResult> SearchFlightAsync(
            FlightRouteSearchRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.PlaneEndpointPath))
            {
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-flight-api",
                    null,
                    null,
                    "Flight endpoint path is not configured.");
            }

            if (!TryValidateFlightRouteRequest(request, out var validationError))
            {
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-flight-api",
                    null,
                    null,
                    validationError);
            }

            var endpoint = BuildUrl(_settings.PlaneEndpointPath, BuildFlightRouteQuery(request));
            var targetUri = BuildAbsoluteUri(_settings.BaseUrl, endpoint);
            using var message = CreateJsonGetRequest(targetUri);

            try
            {
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Flight API request failed with status {StatusCode}.", (int)response.StatusCode);
                    return new FixedIntercitySearchResult(
                        false,
                        "fixed-intercity-flight-api",
                        null,
                        content,
                        $"Flight API returned status {(int)response.StatusCode}.");
                }

                using var document = JsonDocument.Parse(content);
                var parsed = ParseFlightOption(document.RootElement);
                return new FixedIntercitySearchResult(
                    true,
                    "fixed-intercity-flight-api",
                    parsed,
                    content,
                    parsed is null ? "Flight API response was received but no supported fields were found." : null);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Flight API request failed.");
                return new FixedIntercitySearchResult(
                    false,
                    "fixed-intercity-flight-api",
                    null,
                    null,
                    "Flight API request failed. Please verify URL/API key and flight parameters.");
            }
        }

        public async Task<FlightMonthlyCalendarResult> GetFlightMonthlyCalendarAsync(
            FlightMonthlyCalendarRequest request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.PlaneMonthlyCountEndpointPath))
            {
                return new FlightMonthlyCalendarResult(
                    false,
                    "fixed-intercity-flight-calendar-api",
                    null,
                    "Flight monthly calendar endpoint path is not configured.");
            }

            if (!TryValidateFlightMonthlyRequest(request, out var validationError))
            {
                return new FlightMonthlyCalendarResult(
                    false,
                    "fixed-intercity-flight-calendar-api",
                    null,
                    validationError);
            }

            var endpoint = BuildUrl(_settings.PlaneMonthlyCountEndpointPath, BuildFlightMonthlyQuery(request));
            var targetUri = BuildAbsoluteUri(_settings.BaseUrl, endpoint);
            using var message = CreateJsonGetRequest(targetUri);

            try
            {
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Flight monthly calendar API request failed with status {StatusCode}.", (int)response.StatusCode);
                    return new FlightMonthlyCalendarResult(
                        false,
                        "fixed-intercity-flight-calendar-api",
                        content,
                        $"Flight monthly calendar API returned status {(int)response.StatusCode}.");
                }

                return new FlightMonthlyCalendarResult(
                    true,
                    "fixed-intercity-flight-calendar-api",
                    content,
                    null);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Flight monthly calendar API request failed.");
                return new FlightMonthlyCalendarResult(
                    false,
                    "fixed-intercity-flight-calendar-api",
                    null,
                    "Flight monthly calendar API request failed. Please verify URL/API key and query parameters.");
            }
        }

        private HttpRequestMessage CreateJsonGetRequest(string uri)
        {
            var message = new HttpRequestMessage(HttpMethod.Get, uri);
            message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            if (!string.IsNullOrWhiteSpace(_settings.ApiKeyHeaderName) && !string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                message.Headers.Remove(_settings.ApiKeyHeaderName);
                message.Headers.Add(_settings.ApiKeyHeaderName, _settings.ApiKey);
            }

            return message;
        }

        private static IDictionary<string, string> BuildBusQuery(FixedIntercitySearchRequest request)
        {
            var query = new Dictionary<string, string>
            {
                ["date"] = request.DepartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ["page"] = Math.Max(1, request.Page).ToString(CultureInfo.InvariantCulture),
                ["pagesize"] = Math.Clamp(request.PageSize, 1, 1000).ToString(CultureInfo.InvariantCulture)
            };

            if (request.ReturnDate.HasValue)
            {
                query["returnDate"] = request.ReturnDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            }

            if (request.FromId.HasValue)
            {
                query["fromId"] = request.FromId.Value.ToString(CultureInfo.InvariantCulture);
            }
            else
            {
                query["fromLat"] = request.FromLatitude!.Value.ToString(CultureInfo.InvariantCulture);
                query["fromLon"] = request.FromLongitude!.Value.ToString(CultureInfo.InvariantCulture);
            }

            if (request.ToId.HasValue)
            {
                query["toId"] = request.ToId.Value.ToString(CultureInfo.InvariantCulture);
            }
            else
            {
                query["toLat"] = request.ToLatitude!.Value.ToString(CultureInfo.InvariantCulture);
                query["toLon"] = request.ToLongitude!.Value.ToString(CultureInfo.InvariantCulture);
            }

            return query;
        }

        private static IDictionary<string, string> BuildTrainRouteQuery(TrainRouteSearchRequest request)
        {
            var query = new Dictionary<string, string>
            {
                ["from"] = request.From.Trim().ToUpperInvariant(),
                ["to"] = request.To.Trim().ToUpperInvariant(),
                ["departDate"] = request.DepartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ["adults"] = Math.Max(0, request.Adults).ToString(CultureInfo.InvariantCulture),
                ["children"] = Math.Max(0, request.Children).ToString(CultureInfo.InvariantCulture),
                ["seniors"] = Math.Max(0, request.Seniors).ToString(CultureInfo.InvariantCulture),
                ["students"] = Math.Max(0, request.Students).ToString(CultureInfo.InvariantCulture),
                ["unionMembers"] = Math.Max(0, request.UnionMembers).ToString(CultureInfo.InvariantCulture),
                ["page"] = Math.Max(1, request.Page).ToString(CultureInfo.InvariantCulture),
                ["pagesize"] = Math.Clamp(request.PageSize, 1, 100).ToString(CultureInfo.InvariantCulture)
            };

            if (request.ReturnDate.HasValue)
            {
                query["returnDate"] = request.ReturnDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            }

            if (!string.IsNullOrWhiteSpace(request.SeatType))
            {
                query["seatType"] = request.SeatType.Trim().ToLowerInvariant();
            }

            EnsureAtLeastOnePassenger(query);
            return query;
        }

        private static IDictionary<string, string> BuildTrainMonthlyQuery(TrainMonthlyCalendarRequest request)
        {
            var query = new Dictionary<string, string>
            {
                ["from"] = request.From.Trim().ToUpperInvariant(),
                ["to"] = request.To.Trim().ToUpperInvariant(),
                ["month"] = request.Month,
                ["adults"] = Math.Max(0, request.Adults).ToString(CultureInfo.InvariantCulture),
                ["children"] = Math.Max(0, request.Children).ToString(CultureInfo.InvariantCulture),
                ["seniors"] = Math.Max(0, request.Seniors).ToString(CultureInfo.InvariantCulture),
                ["students"] = Math.Max(0, request.Students).ToString(CultureInfo.InvariantCulture),
                ["unionMembers"] = Math.Max(0, request.UnionMembers).ToString(CultureInfo.InvariantCulture)
            };

            if (!string.IsNullOrWhiteSpace(request.SeatType))
            {
                query["seatType"] = request.SeatType.Trim().ToLowerInvariant();
            }

            EnsureAtLeastOnePassenger(query);
            return query;
        }

        private static IDictionary<string, string> BuildFlightRouteQuery(FlightRouteSearchRequest request)
        {
            var query = new Dictionary<string, string>
            {
                ["from"] = request.From.Trim().ToUpperInvariant(),
                ["to"] = request.To.Trim().ToUpperInvariant(),
                ["departDate"] = request.DepartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ["cabin"] = NormalizeCabin(request.Cabin),
                ["adults"] = Math.Max(1, request.Adults).ToString(CultureInfo.InvariantCulture),
                ["children"] = Math.Max(0, request.Children).ToString(CultureInfo.InvariantCulture),
                ["infants"] = Math.Max(0, request.Infants).ToString(CultureInfo.InvariantCulture),
                ["page"] = Math.Max(1, request.Page).ToString(CultureInfo.InvariantCulture),
                ["pagesize"] = Math.Clamp(request.PageSize, 1, 100).ToString(CultureInfo.InvariantCulture)
            };

            if (request.ReturnDate.HasValue)
            {
                query["returnDate"] = request.ReturnDate.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            }

            return query;
        }

        private static IDictionary<string, string> BuildFlightMonthlyQuery(FlightMonthlyCalendarRequest request)
        {
            return new Dictionary<string, string>
            {
                ["from"] = request.From.Trim().ToUpperInvariant(),
                ["to"] = request.To.Trim().ToUpperInvariant(),
                ["month"] = request.Month,
                ["cabin"] = NormalizeCabin(request.Cabin),
                ["adults"] = Math.Max(1, request.Adults).ToString(CultureInfo.InvariantCulture),
                ["children"] = Math.Max(0, request.Children).ToString(CultureInfo.InvariantCulture),
                ["infants"] = Math.Max(0, request.Infants).ToString(CultureInfo.InvariantCulture)
            };
        }

        private static void EnsureAtLeastOnePassenger(IDictionary<string, string> query)
        {
            var adults = int.Parse(query["adults"], CultureInfo.InvariantCulture);
            var children = int.Parse(query["children"], CultureInfo.InvariantCulture);
            var seniors = int.Parse(query["seniors"], CultureInfo.InvariantCulture);
            var students = int.Parse(query["students"], CultureInfo.InvariantCulture);
            var unionMembers = int.Parse(query["unionMembers"], CultureInfo.InvariantCulture);
            var total = adults + children + seniors + students + unionMembers;

            if (total <= 0)
            {
                query["adults"] = "1";
            }
        }

        private static bool TryValidateBusRequest(FixedIntercitySearchRequest request, out string error)
        {
            var hasFromId = request.FromId.HasValue;
            var hasFromCoordinates = request.FromLatitude.HasValue || request.FromLongitude.HasValue;
            var fromCoordinatesComplete = request.FromLatitude.HasValue && request.FromLongitude.HasValue;

            if (hasFromId == hasFromCoordinates)
            {
                error = "Invalid origin input. Provide exactly one of fromId or fromLat/fromLon.";
                return false;
            }

            if (hasFromCoordinates && !fromCoordinatesComplete)
            {
                error = "Invalid origin coordinates. fromLat and fromLon must be provided together.";
                return false;
            }

            if (request.FromId is <= 0)
            {
                error = "Invalid origin fromId. fromId must be >= 1.";
                return false;
            }

            if (request.FromLatitude is < -90 or > 90 || request.FromLongitude is < -180 or > 180)
            {
                error = "Invalid origin coordinates. fromLat must be in [-90,90] and fromLon in [-180,180].";
                return false;
            }

            var hasToId = request.ToId.HasValue;
            var hasToCoordinates = request.ToLatitude.HasValue || request.ToLongitude.HasValue;
            var toCoordinatesComplete = request.ToLatitude.HasValue && request.ToLongitude.HasValue;

            if (hasToId == hasToCoordinates)
            {
                error = "Invalid destination input. Provide exactly one of toId or toLat/toLon.";
                return false;
            }

            if (hasToCoordinates && !toCoordinatesComplete)
            {
                error = "Invalid destination coordinates. toLat and toLon must be provided together.";
                return false;
            }

            if (request.ToId is <= 0)
            {
                error = "Invalid destination toId. toId must be >= 1.";
                return false;
            }

            if (request.ToLatitude is < -90 or > 90 || request.ToLongitude is < -180 or > 180)
            {
                error = "Invalid destination coordinates. toLat must be in [-90,90] and toLon in [-180,180].";
                return false;
            }

            if (request.ReturnDate.HasValue && request.ReturnDate.Value < request.DepartDate)
            {
                error = "Invalid returnDate. returnDate must be on or after date.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool TryValidateTrainRouteRequest(TrainRouteSearchRequest request, out string error)
        {
            if (!TryValidateStationCode(request.From))
            {
                error = "Invalid train origin station code (from).";
                return false;
            }

            if (!TryValidateStationCode(request.To))
            {
                error = "Invalid train destination station code (to).";
                return false;
            }

            if (request.ReturnDate.HasValue && request.ReturnDate.Value < request.DepartDate)
            {
                error = "Invalid returnDate. returnDate must be on or after departDate.";
                return false;
            }

            if (!TryValidateSeatType(request.SeatType))
            {
                error = "Invalid seatType. Supported values: hard_seat, soft_seat, sleeper_4, sleeper_6.";
                return false;
            }

            if (request.Adults < 0 || request.Children < 0 || request.Seniors < 0 || request.Students < 0 || request.UnionMembers < 0)
            {
                error = "Invalid passenger groups. All passenger counts must be >= 0.";
                return false;
            }

            if (request.Page < 1)
            {
                error = "Invalid page. page must be >= 1.";
                return false;
            }

            if (request.PageSize < 1 || request.PageSize > 100)
            {
                error = "Invalid pagesize. pagesize must be in range 1..100.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool TryValidateTrainMonthlyRequest(TrainMonthlyCalendarRequest request, out string error)
        {
            if (!TryValidateStationCode(request.From))
            {
                error = "Invalid train origin station code (from).";
                return false;
            }

            if (!TryValidateStationCode(request.To))
            {
                error = "Invalid train destination station code (to).";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.Month) || !YearMonthRegex.IsMatch(request.Month))
            {
                error = "Invalid month. month must match YYYY-MM.";
                return false;
            }

            if (!TryValidateSeatType(request.SeatType))
            {
                error = "Invalid seatType. Supported values: hard_seat, soft_seat, sleeper_4, sleeper_6.";
                return false;
            }

            if (request.Adults < 0 || request.Children < 0 || request.Seniors < 0 || request.Students < 0 || request.UnionMembers < 0)
            {
                error = "Invalid passenger groups. All passenger counts must be >= 0.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool TryValidateFlightRouteRequest(FlightRouteSearchRequest request, out string error)
        {
            if (!TryValidateAirportCode(request.From))
            {
                error = "Invalid flight origin IATA code (from).";
                return false;
            }

            if (!TryValidateAirportCode(request.To))
            {
                error = "Invalid flight destination IATA code (to).";
                return false;
            }

            if (request.DepartDate < GetVietnamToday())
            {
                error = "Invalid departDate. departDate must be today or later in Vietnam timezone.";
                return false;
            }

            if (request.ReturnDate.HasValue && request.ReturnDate.Value < request.DepartDate)
            {
                error = "Invalid returnDate. returnDate must be on or after departDate.";
                return false;
            }

            if (!TryValidateCabin(request.Cabin))
            {
                error = "Invalid cabin. Supported values: economy, premium_economy, business.";
                return false;
            }

            if (request.Adults < 1 || request.Children < 0 || request.Infants < 0)
            {
                error = "Invalid passenger groups. adults must be >= 1, children/infants must be >= 0.";
                return false;
            }

            if (request.Infants > request.Adults)
            {
                error = "Invalid passenger groups. infants must be <= adults.";
                return false;
            }

            if (request.Page < 1)
            {
                error = "Invalid page. page must be >= 1.";
                return false;
            }

            if (request.PageSize < 1 || request.PageSize > 100)
            {
                error = "Invalid pagesize. pagesize must be in range 1..100.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool TryValidateFlightMonthlyRequest(FlightMonthlyCalendarRequest request, out string error)
        {
            if (!TryValidateAirportCode(request.From))
            {
                error = "Invalid flight origin IATA code (from).";
                return false;
            }

            if (!TryValidateAirportCode(request.To))
            {
                error = "Invalid flight destination IATA code (to).";
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.Month) || !YearMonthRegex.IsMatch(request.Month))
            {
                error = "Invalid month. month must match YYYY-MM.";
                return false;
            }

            if (!TryValidateCabin(request.Cabin))
            {
                error = "Invalid cabin. Supported values: economy, premium_economy, business.";
                return false;
            }

            if (request.Adults < 1 || request.Children < 0 || request.Infants < 0)
            {
                error = "Invalid passenger groups. adults must be >= 1, children/infants must be >= 0.";
                return false;
            }

            if (request.Infants > request.Adults)
            {
                error = "Invalid passenger groups. infants must be <= adults.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool TryValidateStationCode(string stationCode)
        {
            return !string.IsNullOrWhiteSpace(stationCode)
                && StationCodeRegex.IsMatch(stationCode.Trim().ToUpperInvariant());
        }

        private static bool TryValidateSeatType(string? seatType)
        {
            return string.IsNullOrWhiteSpace(seatType)
                || SupportedTrainSeatTypes.Contains(seatType.Trim().ToLowerInvariant());
        }

        private static bool TryValidateCabin(string? cabin)
        {
            return string.IsNullOrWhiteSpace(cabin)
                || SupportedFlightCabins.Contains(cabin.Trim().ToLowerInvariant());
        }

        private static bool TryValidateAirportCode(string airportCode)
        {
            return !string.IsNullOrWhiteSpace(airportCode)
                && IataAirportCodeRegex.IsMatch(airportCode.Trim().ToUpperInvariant());
        }

        private static string NormalizeCabin(string? cabin)
        {
            return string.IsNullOrWhiteSpace(cabin)
                ? FlightCabinTypes.Economy
                : cabin.Trim().ToLowerInvariant();
        }

        private static DateOnly GetVietnamToday()
        {
            static DateOnly ToDateOnlyInZone(string zoneId)
            {
                var zone = TimeZoneInfo.FindSystemTimeZoneById(zoneId);
                var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
                return DateOnly.FromDateTime(local);
            }

            try
            {
                return ToDateOnlyInZone("SE Asia Standard Time");
            }
            catch
            {
                try
                {
                    return ToDateOnlyInZone("Asia/Bangkok");
                }
                catch
                {
                    return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
                }
            }
        }

        private static FixedIntercityOption? ParseBusOption(JsonElement root)
        {
            if (!TryGetAverageDouble(root, DurationMinuteKeys, out var durationMinutes))
            {
                if (TryGetAverageDouble(root, DurationSecondKeys, out var durationSeconds))
                {
                    durationMinutes = durationSeconds / 60d;
                }
                else if (TryGetAverageDouble(root, DurationGenericKeys, out var genericDuration))
                {
                    durationMinutes = genericDuration > 1000d
                        ? genericDuration / 60d
                        : genericDuration;
                }
            }

            var hasCost = TryGetAverageDouble(root, CostKeys, out var costRaw);
            var method = TryGetString(root, MethodKeys) ?? "Bus";

            if (durationMinutes <= 0 && !hasCost)
            {
                return null;
            }

            // Extract from/to hub info from the first trip in the API response
            int? fromHubId = null;
            string? fromHubName = null;
            int? toHubId = null;
            string? toHubName = null;
            TryExtractBusHubInfo(root, out fromHubId, out fromHubName, out toHubId, out toHubName);

            return new FixedIntercityOption(
                method,
                durationMinutes <= 0 ? 0 : Math.Max(1, (int)Math.Round(durationMinutes)),
                hasCost ? Decimal.Round((decimal)costRaw, 2) : 0,
                "FixedIntercity from bus API",
                fromHubId, fromHubName, toHubId, toHubName);
        }

        /// <summary>
        /// Extracts from.id, from.name, to.id, to.name from the bus API response.
        /// The API returns: { "outbound": { "trips": [{ "from": { "id": 123, "name": "..." }, "to": { "id": 456, "name": "..." } }] } }
        /// </summary>
        private static void TryExtractBusHubInfo(JsonElement root, out int? fromId, out string? fromName, out int? toId, out string? toName)
        {
            fromId = null; fromName = null; toId = null; toName = null;

            // Try to find the first trip element that has from/to objects
            var tripElement = FindFirstTripWithFromTo(root, 0);
            if (tripElement == null) return;

            var trip = tripElement.Value;
            if (trip.TryGetProperty("from", out var fromEl) && fromEl.ValueKind == JsonValueKind.Object)
            {
                if (fromEl.TryGetProperty("id", out var fromIdEl))
                {
                    if (fromIdEl.ValueKind == JsonValueKind.Number && fromIdEl.TryGetInt32(out var fid))
                        fromId = fid;
                    else if (fromIdEl.ValueKind == JsonValueKind.String && int.TryParse(fromIdEl.GetString(), out var fidStr))
                        fromId = fidStr;
                }
                if (fromEl.TryGetProperty("name", out var fromNameEl) && fromNameEl.ValueKind == JsonValueKind.String)
                    fromName = fromNameEl.GetString();
            }

            if (trip.TryGetProperty("to", out var toEl) && toEl.ValueKind == JsonValueKind.Object)
            {
                if (toEl.TryGetProperty("id", out var toIdEl))
                {
                    if (toIdEl.ValueKind == JsonValueKind.Number && toIdEl.TryGetInt32(out var tid))
                        toId = tid;
                    else if (toIdEl.ValueKind == JsonValueKind.String && int.TryParse(toIdEl.GetString(), out var tidStr))
                        toId = tidStr;
                }
                if (toEl.TryGetProperty("name", out var toNameEl) && toNameEl.ValueKind == JsonValueKind.String)
                    toName = toNameEl.GetString();
            }
        }

        /// <summary>
        /// Recursively searches for the first JSON object that has both "from" and "to" properties
        /// (representing a bus trip element in the API response).
        /// </summary>
        private static JsonElement? FindFirstTripWithFromTo(JsonElement element, int depth)
        {
            if (depth > 6) return null;

            if (element.ValueKind == JsonValueKind.Object)
            {
                if (element.TryGetProperty("from", out var fromEl) && fromEl.ValueKind == JsonValueKind.Object
                    && element.TryGetProperty("to", out var toEl) && toEl.ValueKind == JsonValueKind.Object)
                {
                    return element;
                }

                foreach (var prop in element.EnumerateObject())
                {
                    var result = FindFirstTripWithFromTo(prop.Value, depth + 1);
                    if (result != null) return result;
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in element.EnumerateArray())
                {
                    var result = FindFirstTripWithFromTo(item, depth + 1);
                    if (result != null) return result;
                }
            }

            return null;
        }

        private static FixedIntercityOption? ParseTrainOption(JsonElement root)
        {
            if (!TryGetAverageDouble(root, DurationMinuteKeys, out var durationMinutes))
            {
                if (TryGetAverageDouble(root, DurationSecondKeys, out var durationSeconds))
                {
                    durationMinutes = durationSeconds / 60d;
                }
                else if (TryGetAverageDouble(root, DurationGenericKeys, out var genericDuration))
                {
                    durationMinutes = genericDuration > 1000d
                        ? genericDuration / 60d
                        : genericDuration;
                }
            }

            var hasCost = TryGetAverageDouble(root, CostKeys, out var costRaw);
            var method = TryGetString(root, MethodKeys) ?? "Train";

            if (durationMinutes <= 0 && !hasCost)
            {
                return null;
            }

            return new FixedIntercityOption(
                method,
                durationMinutes <= 0 ? 0 : Math.Max(1, (int)Math.Round(durationMinutes)),
                hasCost ? Decimal.Round((decimal)costRaw, 2) : 0,
                "FixedIntercity from train API");
        }

        private static FixedIntercityOption? ParseFlightOption(JsonElement root)
        {
            if (!TryGetAverageDouble(root, DurationMinuteKeys, out var durationMinutes))
            {
                if (TryGetAverageDouble(root, DurationSecondKeys, out var durationSeconds))
                {
                    durationMinutes = durationSeconds / 60d;
                }
                else if (TryGetAverageDouble(root, DurationGenericKeys, out var genericDuration))
                {
                    durationMinutes = genericDuration > 1000d
                        ? genericDuration / 60d
                        : genericDuration;
                }
            }

            var hasCost = TryGetAverageDouble(root, CostKeys, out var costRaw);
            var method = TryGetString(root, FlightMethodKeys) ?? "Flight";

            if (durationMinutes <= 0 && !hasCost)
            {
                return null;
            }

            return new FixedIntercityOption(
                method,
                durationMinutes <= 0 ? 0 : Math.Max(1, (int)Math.Round(durationMinutes)),
                hasCost ? Decimal.Round((decimal)costRaw, 2) : 0,
                "FixedIntercity from flight API");
        }

        private static bool TryGetAverageDouble(JsonElement root, HashSet<string> keys, out double average)
        {
            var values = new List<double>();
            CollectValuesFromArrayItems(root, keys, values);
            var valid = values.Where(v => v > 0).ToList();

            if (valid.Count > 0)
            {
                average = valid.Average();
                return true;
            }

            if (TryGetDouble(root, keys, out var single) && single > 0)
            {
                average = single;
                return true;
            }

            average = 0;
            return false;
        }

        private static void CollectValuesFromArrayItems(
            JsonElement element, HashSet<string> keys, List<double> values, int depth = 0)
        {
            if (depth > 10) return;

            if (element.ValueKind == JsonValueKind.Array)
            {
                var local = new List<double>();
                foreach (var item in element.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Object && TryGetDouble(item, keys, out var val))
                    {
                        local.Add(val);
                    }
                }

                if (local.Count > 0)
                {
                    values.AddRange(local);
                    return;
                }

                foreach (var item in element.EnumerateArray())
                {
                    CollectValuesFromArrayItems(item, keys, values, depth + 1);
                }
            }
            else if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    CollectValuesFromArrayItems(property.Value, keys, values, depth + 1);
                }
            }
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

        private static string? TryGetString(JsonElement root, HashSet<string> keys)
        {
            if (!TryFindProperty(root, keys, out var element))
            {
                return null;
            }

            return element.ValueKind == JsonValueKind.String
                ? element.GetString()
                : element.ToString();
        }

        private static bool TryFindProperty(JsonElement element, HashSet<string> keys, out JsonElement found)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (IgnoredParsingKeys.Contains(property.Name))
                    {
                        continue;
                    }

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
            var queryString = string.Join("&", query
                .Where(kv => !string.IsNullOrWhiteSpace(kv.Value))
                .Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));

            return string.IsNullOrWhiteSpace(queryString)
                ? endpoint
                : $"{endpoint}?{queryString}";
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
    }
}
