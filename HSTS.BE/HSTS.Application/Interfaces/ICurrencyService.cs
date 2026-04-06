namespace HSTS.Application.Interfaces
{
    public record ConvertedAmount(
        decimal Amount,
        string Currency,
        decimal BaseAmount,
        string BaseCurrency);

    public interface ICurrencyService
    {
        Task<Dictionary<string, decimal>> GetRatesAsync(CancellationToken cancellationToken = default);
        Task<ConvertedAmount> ConvertFromVndAsync(decimal vndAmount, string targetCurrency, CancellationToken cancellationToken = default);
    }
}
