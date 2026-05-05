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

            try
            {
                var rates = await FetchRatesFromApiAsync(cancellationToken);

                _cache.Set(CacheKey, rates, TimeSpan.FromMinutes(_settings.CacheMinutes));

                // Save to fallback cache with NeverRemove priority so it persists beyond normal expiration
                var fallbackOptions = new MemoryCacheEntryOptions()
                    .SetPriority(CacheItemPriority.NeverRemove);
                _cache.Set(CacheKey + "_Fallback", rates, fallbackOptions);

                return rates;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch fresh exchange rates. Attempting to use stale cache fallback.");
                
                if (_cache.TryGetValue(CacheKey + "_Fallback", out Dictionary<string, decimal>? staleCached) && staleCached is not null)
                {
                    _logger.LogInformation("Using stale exchange rates from fallback cache.");
                    return staleCached;
                }
                
                _logger.LogError("No stale cache available for exchange rates. Bubbling up exception.");
                throw;
            }
        }

        public async Task<ConvertedAmount> ConvertFromVndAsync(decimal vndAmount, string targetCurrency, CancellationToken cancellationToken = default)
        {
            var upperTarget = NormalizeCurrency(targetCurrency);

            if (string.Equals(upperTarget, BaseCurrency, StringComparison.OrdinalIgnoreCase))
            {
                return new ConvertedAmount(vndAmount, BaseCurrency, vndAmount, BaseCurrency);
            }

            var rates = await GetRatesAsync(cancellationToken);
            var convertedAmount = ConvertUsdBasedRate(vndAmount, BaseCurrency, upperTarget, rates);

            return new ConvertedAmount(convertedAmount, upperTarget, vndAmount, BaseCurrency);
        }

        public async Task<ConvertedAmount> ConvertToVndAsync(decimal amount, string sourceCurrency, CancellationToken cancellationToken = default)
        {
            var upperSource = NormalizeCurrency(sourceCurrency);

            if (string.Equals(upperSource, BaseCurrency, StringComparison.OrdinalIgnoreCase))
            {
                return new ConvertedAmount(amount, BaseCurrency, amount, BaseCurrency);
            }

            var rates = await GetRatesAsync(cancellationToken);
            var vndAmount = ConvertUsdBasedRate(amount, upperSource, BaseCurrency, rates);

            return new ConvertedAmount(amount, upperSource, vndAmount, BaseCurrency);
        }

        public async Task<IReadOnlyList<CurrencyRateDto>> GetVndRelativeRatesAsync(CancellationToken cancellationToken = default)
        {
            var rates = await GetRatesAsync(cancellationToken);

            if (!rates.TryGetValue("VND", out var vndRate) || vndRate <= 0)
                throw new InvalidOperationException("VND rate not available from exchange rate API.");

            return rates
                .Where(rate => rate.Value > 0)
                .Select(rate => new CurrencyRateDto(
                    rate.Key.ToUpperInvariant(),
                    Math.Round(vndRate / rate.Value, 6)))
                .OrderBy(rate => rate.CurrencyCode == BaseCurrency ? 0 : 1)
                .ThenBy(rate => rate.CurrencyCode)
                .ToList();
        }

        private static decimal ConvertUsdBasedRate(
            decimal amount,
            string sourceCurrency,
            string targetCurrency,
            Dictionary<string, decimal> rates)
        {
            if (!rates.TryGetValue(sourceCurrency, out var sourceRate) || sourceRate <= 0)
                throw new InvalidOperationException($"Exchange rate for {sourceCurrency} not available.");

            if (!rates.TryGetValue(targetCurrency, out var targetRate) || targetRate <= 0)
                throw new InvalidOperationException($"Exchange rate for {targetCurrency} not available.");

            return Math.Round(amount / sourceRate * targetRate, 2);
        }

        private static string NormalizeCurrency(string currencyCode)
        {
            var normalized = string.IsNullOrWhiteSpace(currencyCode)
                ? BaseCurrency
                : currencyCode.Trim().ToUpperInvariant();

            if (normalized.Length != 3)
                throw new InvalidOperationException("Currency code must be exactly 3 characters.");

            return normalized;
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
