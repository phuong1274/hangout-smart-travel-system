namespace HSTS.Application.Interfaces
{
    public record WeatherAdvice(
        string Summary,
        bool IsOutdoorFriendly,
        string Source);

    public interface IWeatherAdvisoryService
    {
        Task<WeatherAdvice?> GetAdviceAsync(
            string location,
            DateOnly date,
            CancellationToken cancellationToken = default);
    }
}
