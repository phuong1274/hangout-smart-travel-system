using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransportModes.Commands
{
    public record UpdateTransportModeCommand(
        int Id,
        string Name,
        int Category,
        int Capacity) : IRequest<ErrorOr<TransportModeDto>>;

    public class UpdateTransportModeCommandHandler
        : IRequestHandler<UpdateTransportModeCommand, ErrorOr<TransportModeDto>>
    {
        private readonly IRepository<TransportMode> _repository;

        public UpdateTransportModeCommandHandler(IRepository<TransportMode> repository)
            => _repository = repository;

        public async Task<ErrorOr<TransportModeDto>> Handle(
            UpdateTransportModeCommand request, CancellationToken ct)
        {
            var entity = await _repository.Query()
                .Include(x => x.LocalTransportMetrics)
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, ct);

            if (entity is null)
                return Error.NotFound("TransportMode.NotFound",
                    $"Transport mode with ID {request.Id} not found.");

            var duplicate = await _repository.Query()
                .AnyAsync(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted, ct);

            if (duplicate)
                return Error.Conflict("TransportMode.DuplicateName",
                    $"A transport mode with the name '{request.Name}' already exists.");

            entity.Name = request.Name;
            entity.Category = (CategoryTransport)request.Category;
            entity.Capacity = request.Capacity;
            entity.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(entity, ct);
            return entity.ToDto();
        }
    }

    public class UpdateTransportModeCommandValidator : AbstractValidator<UpdateTransportModeCommand>
    {
        public UpdateTransportModeCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0);
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Category).Must(c => Enum.IsDefined(typeof(CategoryTransport), c))
                .WithMessage("Invalid transport category.");
            RuleFor(x => x.Capacity).GreaterThan(0);
        }
    }
}
