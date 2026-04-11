using System.Text.Json;
using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HSTS.Infrastructure.Services
{
    public class CurrencyService : ICurrencyService
    {
        private const string CacheKey = "ExchangeRates";
        private const string BaseCurrency = "VND";

        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly ExchangeRateSettings _settings;
        private readonly ILogger<CurrencyService> _logger;

        public CurrencyService(
            HttpClient httpClient,
            IMemoryCache cache,
            IOptions<ExchangeRateSettings> settings,
            ILogger<CurrencyService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<Dictionary<string, decimal>> GetRatesAsync(CancellationToken cancellationToken = default)
        {
            if (_cache.TryGetValue(CacheKey, out Dictionary<string, decimal>? cached) && cached is not null)
                return cached;

            var rates = await FetchRatesFromApiAsync(cancellationToken);

            _cache.Set(CacheKey, rates, TimeSpan.FromMinutes(_settings.CacheMinutes));

            return rates;
        }

        public async Task<ConvertedAmount> ConvertFromVndAsync(decimal vndAmount, string targetCurrency, CancellationToken cancellationToken = default)
        {
            if (string.Equals(targetCurrency, BaseCurrency, StringComparison.OrdinalIgnoreCase))
            {
                return new ConvertedAmount(vndAmount, BaseCurrency, vndAmount, BaseCurrency);
            }

            var rates = await GetRatesAsync(cancellationToken);

            var upperTarget = targetCurrency.ToUpperInvariant();

            if (!rates.TryGetValue("VND", out var vndRate) || vndRate <= 0)
                throw new InvalidOperationException("VND rate not available from exchange rate API.");

            if (!rates.TryGetValue(upperTarget, out var targetRate) || targetRate <= 0)
                throw new InvalidOperationException($"Exchange rate for {upperTarget} not available.");

            // convertedAmount = baseAmount / rate[VND] * rate[targetCurrency]
            var convertedAmount = Math.Round(vndAmount / vndRate * targetRate, 2);

            return new ConvertedAmount(convertedAmount, upperTarget, vndAmount, BaseCurrency);
        }

        private async Task<Dictionary<string, decimal>> FetchRatesFromApiAsync(CancellationToken cancellationToken)
        {
            var url = $"{_settings.BaseUrl.TrimEnd('/')}/{_settings.ApiKey}/latest/USD";

            try
            {
                var response = await _httpClient.GetAsync(url, cancellationToken);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(json);

                var root = doc.RootElement;

                if (root.TryGetProperty("result", out var resultProp) &&
                    resultProp.GetString() != "success")
                {
                    throw new InvalidOperationException("Exchange rate API returned non-success result.");
                }

                var rates = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

                if (root.TryGetProperty("conversion_rates", out var ratesProp))
                {
                    foreach (var prop in ratesProp.EnumerateObject())
                    {
                        if (prop.Value.TryGetDecimal(out var rate))
                        {
                            rates[prop.Name.ToUpperInvariant()] = rate;
                        }
                    }
                }

                if (rates.Count == 0)
                    throw new InvalidOperationException("No exchange rates returned from API.");

                _logger.LogInformation("Fetched {Count} exchange rates from API", rates.Count);
                return rates;
            }
            catch (Exception ex) when (ex is not InvalidOperationException)
            {
                _logger.LogError(ex, "Failed to fetch exchange rates from {Url}", url);
                throw new InvalidOperationException("Failed to fetch exchange rates.", ex);
            }
        }
    }
}
