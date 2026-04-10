using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.TransitHubQueries.Queries
{
    public record GetTransitHubsByTransportationQuery(
        int TransportationId) : IRequest<ErrorOr<List<TransitHubItemDto>>>;

    public class GetTransitHubsByTransportationQueryValidator
        : AbstractValidator<GetTransitHubsByTransportationQuery>
    {
        public GetTransitHubsByTransportationQueryValidator()
        {
            RuleFor(x => x.TransportationId)
                .GreaterThan(0)
                .WithMessage("TransportationId must be a positive number.");
        }
    }

    public class GetTransitHubsByTransportationQueryHandler
        : IRequestHandler<GetTransitHubsByTransportationQuery, ErrorOr<List<TransitHubItemDto>>>
    {
        private readonly IAppDbContext _context;

        public GetTransitHubsByTransportationQueryHandler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ErrorOr<List<TransitHubItemDto>>> Handle(
            GetTransitHubsByTransportationQuery request,
            CancellationToken cancellationToken)
        {
            var hubs = await _context.TransitHubs
                .AsNoTracking()
                .Include(x => x.TransitHubType)
                .Include(x => x.TransportMode)
                .Include(x => x.District)
                    .ThenInclude(d => d.Province)
                .Where(x => x.TransportationId == request.TransportationId && !x.IsDeleted)
                .OrderBy(x => x.Name)
                .ToListAsync(cancellationToken);

            var result = hubs.Select(MapToDto).ToList();
            return result;
        }

        private static TransitHubItemDto MapToDto(Domain.Entities.TransitHubs hub)
        {
            return new TransitHubItemDto(
                hub.Id,
                hub.Code,
                hub.Name,
                hub.Latitude,
                hub.Longitude,
                hub.TransportationId,
                hub.TransportMode?.Name,
                hub.TransitHubTypeId,
                hub.TransitHubType?.Name,
                hub.DistrictId,
                hub.District?.Name,
                hub.District?.Province?.EnglishName);
        }
    }
}
