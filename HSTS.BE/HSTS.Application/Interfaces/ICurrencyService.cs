namespace HSTS.Application.Interfaces
{
    public record ConvertedAmount(
        decimal Amount,
        string Currency,
        decimal BaseAmount,
        string BaseCurrency);

    public record CurrencyRateDto(
        string CurrencyCode,
        decimal VndRate);

    public interface ICurrencyService
    {
        Task<Dictionary<string, decimal>> GetRatesAsync(CancellationToken cancellationToken = default);
        Task<ConvertedAmount> ConvertFromVndAsync(decimal vndAmount, string targetCurrency, CancellationToken cancellationToken = default);
        Task<ConvertedAmount> ConvertToVndAsync(decimal amount, string sourceCurrency, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<CurrencyRateDto>> GetVndRelativeRatesAsync(CancellationToken cancellationToken = default);
    }
}
