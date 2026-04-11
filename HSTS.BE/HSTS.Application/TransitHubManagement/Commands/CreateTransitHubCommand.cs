using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransitHubManagement.Commands
{
    public record CreateTransitHubCommand(
        string Code,
        string Name,
        double Latitude,
        double Longitude,
        int DistrictId,
        int TransportationId,
        int TransitHubTypeId) : IRequest<ErrorOr<TransitHubDto>>;

    public class CreateTransitHubCommandHandler
        : IRequestHandler<CreateTransitHubCommand, ErrorOr<TransitHubDto>>
    {
        private readonly IRepository<Domain.Entities.TransitHubs> _repository;
        private readonly IAppDbContext _context;

        public CreateTransitHubCommandHandler(
            IRepository<Domain.Entities.TransitHubs> repository,
            IAppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<ErrorOr<TransitHubDto>> Handle(
            CreateTransitHubCommand request, CancellationToken ct)
        {
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

            var codeExists = await _repository.Query()
                .AnyAsync(x => x.Code == request.Code && !x.IsDeleted, ct);

            if (codeExists)
                return Error.Conflict("TransitHub.DuplicateCode",
                    $"A transit hub with code '{request.Code}' already exists.");

            var entity = new Domain.Entities.TransitHubs
            {
                Code = request.Code,
                Name = request.Name,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                DistrictId = request.DistrictId,
                TransportationId = request.TransportationId,
                TransitHubTypeId = request.TransitHubTypeId
            };

            await _repository.AddAsync(entity, ct);

            // Reload with navigation properties for response
            var created = await _repository.Query()
                .AsNoTracking()
                .Include(x => x.District)
                .Include(x => x.TransportMode)
                .Include(x => x.TransitHubType)
                .FirstAsync(x => x.Id == entity.Id, ct);

            return created.ToDto();
        }
    }

    public class CreateTransitHubCommandValidator : AbstractValidator<CreateTransitHubCommand>
    {
        public CreateTransitHubCommandValidator()
        {
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
