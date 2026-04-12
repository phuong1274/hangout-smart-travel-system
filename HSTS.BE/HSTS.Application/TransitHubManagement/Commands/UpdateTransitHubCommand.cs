using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransitHubManagement.Commands
{
    public record UpdateTransitHubCommand(
        int Id,
        string Code,
        string Name,
        double Latitude,
        double Longitude,
        int DistrictId,
        int TransportationId,
        int TransitHubTypeId) : IRequest<ErrorOr<TransitHubDto>>;

    public class UpdateTransitHubCommandHandler
        : IRequestHandler<UpdateTransitHubCommand, ErrorOr<TransitHubDto>>
    {
        private readonly IRepository<Domain.Entities.TransitHubs> _repository;
        private readonly IAppDbContext _context;

        public UpdateTransitHubCommandHandler(
            IRepository<Domain.Entities.TransitHubs> repository,
            IAppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<ErrorOr<TransitHubDto>> Handle(
            UpdateTransitHubCommand request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("TransitHub.NotFound",
                    $"Transit hub with ID {request.Id} not found.");

            // Validate FK references
            if (!await _context.Districts.AnyAsync(d => d.Id == request.DistrictId && !d.IsDeleted, ct))
                return Error.NotFound("District.NotFound",
                    $"District with ID {request.DistrictId} not found.");

            if (!await _context.TransportModes.AnyAsync(t => t.Id == request.TransportationId && !t.IsDeleted, ct))
                return Error.NotFound("TransportMode.NotFound",
                    $"Transport mode with ID {request.TransportationId} not found.");

            if (!await _context.TransitHubTypes.AnyAsync(t => t.Id == request.TransitHubTypeId && !t.IsDeleted, ct))
                return Error.NotFound("TransitHubType.NotFound",
                    $"Transit hub type with ID {request.TransitHubTypeId} not found.");

            var codeDuplicate = await _repository.Query()
                .AnyAsync(x => x.Code == request.Code && x.Id != request.Id && !x.IsDeleted, ct);

            if (codeDuplicate)
                return Error.Conflict("TransitHub.DuplicateCode",
                    $"A transit hub with code '{request.Code}' already exists.");

            entity.Code = request.Code;
            entity.Name = request.Name;
            entity.Latitude = request.Latitude;
            entity.Longitude = request.Longitude;
            entity.DistrictId = request.DistrictId;
            entity.TransportationId = request.TransportationId;
            entity.TransitHubTypeId = request.TransitHubTypeId;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity, ct);

            // Reload with navigation properties for response (FKs may have changed)
            var updated = await _repository.Query()
                .AsNoTracking()
                .Include(x => x.District)
                .Include(x => x.TransportMode)
                .Include(x => x.TransitHubType)
                .FirstAsync(x => x.Id == entity.Id, ct);

            return updated.ToDto();
        }
    }

    public class UpdateTransitHubCommandValidator : AbstractValidator<UpdateTransitHubCommand>
    {
        public UpdateTransitHubCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0);
            RuleFor(x => x.Code).NotEmpty().MaximumLength(20);
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
            RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
            RuleFor(x => x.DistrictId).GreaterThan(0);
            RuleFor(x => x.TransportationId).GreaterThan(0);
            RuleFor(x => x.TransitHubTypeId).GreaterThan(0);
        }
    }
}
