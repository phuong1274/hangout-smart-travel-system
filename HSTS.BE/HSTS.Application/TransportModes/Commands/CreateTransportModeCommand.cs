using HSTS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.TransportModes.Commands
{
    public record CreateTransportModeCommand(
        string Name,
        int Category,
        int Capacity) : IRequest<ErrorOr<TransportModeDto>>;

    public class CreateTransportModeCommandHandler
        : IRequestHandler<CreateTransportModeCommand, ErrorOr<TransportModeDto>>
    {
        private readonly IRepository<TransportMode> _repository;

        public CreateTransportModeCommandHandler(IRepository<TransportMode> repository)
            => _repository = repository;

        public async Task<ErrorOr<TransportModeDto>> Handle(
            CreateTransportModeCommand request, CancellationToken ct)
        {
            var exists = await _repository.Query()
                .AnyAsync(x => x.Name == request.Name && !x.IsDeleted, ct);

            if (exists)
                return Error.Conflict("TransportMode.DuplicateName",
                    $"A transport mode with the name '{request.Name}' already exists.");

            var entity = new TransportMode
            {
                Name = request.Name,
                Category = (CategoryTransport)request.Category,
                Capacity = request.Capacity
            };

            await _repository.AddAsync(entity, ct);
            return entity.ToDto();
        }
    }

    public class CreateTransportModeCommandValidator : AbstractValidator<CreateTransportModeCommand>
    {
        public CreateTransportModeCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Category).Must(c => Enum.IsDefined(typeof(CategoryTransport), c))
                .WithMessage("Invalid transport category.");
            RuleFor(x => x.Capacity).GreaterThan(0);
        }
    }
}
