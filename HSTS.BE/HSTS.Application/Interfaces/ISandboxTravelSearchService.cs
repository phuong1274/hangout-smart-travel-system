namespace HSTS.Application.Interfaces
{
    public record SandboxTravelSearchRequest(
        string From,
        string To,
        DateOnly DepartDate,
        DateOnly? ReturnDate,
        string Cabin,
        int Adults,
        int Children,
        int Infants,
        int Page,
        int PageSize);

    public record SandboxTravelSearchResult(
        bool IsSuccess,
        string? RawResponse,
        string? ErrorMessage,
        string Source);

    public interface ISandboxTravelSearchService
    {
        Task<SandboxTravelSearchResult> SearchAsync(
            SandboxTravelSearchRequest request,
            CancellationToken cancellationToken = default);
    }
}
