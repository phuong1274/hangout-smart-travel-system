using HSTS.Application.Interfaces;

namespace HSTS.Application.Itineraries.Queries
{
    public record SearchSandboxTransportQuery(
        string From,
        string To,
        DateOnly DepartDate,
        DateOnly? ReturnDate,
        string Cabin = "economy",
        int Adults = 1,
        int Children = 0,
        int Infants = 0,
        int Page = 1,
        int PageSize = 20) : IRequest<ErrorOr<SandboxTravelSearchResult>>;

    public class SearchSandboxTransportQueryValidator : AbstractValidator<SearchSandboxTransportQuery>
    {
        public SearchSandboxTransportQueryValidator()
        {
            RuleFor(x => x.From).NotEmpty().MaximumLength(200);
            RuleFor(x => x.To).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Adults).GreaterThanOrEqualTo(1);
            RuleFor(x => x.Children).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Infants).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        }
    }

    public class SearchSandboxTransportQueryHandler : IRequestHandler<SearchSandboxTransportQuery, ErrorOr<SandboxTravelSearchResult>>
    {
        private readonly ISandboxTravelSearchService _sandboxTravelSearchService;

        public SearchSandboxTransportQueryHandler(ISandboxTravelSearchService sandboxTravelSearchService)
        {
            _sandboxTravelSearchService = sandboxTravelSearchService;
        }

        public async Task<ErrorOr<SandboxTravelSearchResult>> Handle(
            SearchSandboxTransportQuery request,
            CancellationToken cancellationToken)
        {
            var result = await _sandboxTravelSearchService.SearchAsync(
                new SandboxTravelSearchRequest(
                    request.From,
                    request.To,
                    request.DepartDate,
                    request.ReturnDate,
                    request.Cabin,
                    request.Adults,
                    request.Children,
                    request.Infants,
                    request.Page,
                    request.PageSize),
                cancellationToken);

            return result.IsSuccess
                ? result
                : Error.Validation("SandboxApi.Search", result.ErrorMessage ?? "Sandbox API call failed.");
        }
    }
}
