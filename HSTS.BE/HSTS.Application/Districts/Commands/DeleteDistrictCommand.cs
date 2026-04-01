using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Commands
{
    public record DeleteDistrictCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteDistrictCommandHandler : IRequestHandler<DeleteDistrictCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<District> _repository;
        private readonly IRepository<Location> _locationRepository;

        public DeleteDistrictCommandHandler(IRepository<District> repository, IRepository<Location> locationRepository)
        {
            _repository = repository;
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteDistrictCommand request, CancellationToken cancellationToken)
        {
            var district = await _repository.GetAsync(request.Id, cancellationToken);

            if (district is null || district.IsDeleted)
            {
                return Error.NotFound("District.NotFound", $"District with ID {request.Id} not found.");
            }

            // Check if any non-deleted locations are using this district
            var locationsUsingDistrict = await _locationRepository.Query()
                .Where(l => l.DistrictId == request.Id && !l.IsDeleted)
                .AnyAsync(cancellationToken);

            if (locationsUsingDistrict)
            {
                return Error.Validation(
                    "District.CannotDelete",
                    "Cannot delete district because it is being used by one or more active locations.");
            }

            // Soft delete
            district.IsDeleted = true;
            await _repository.UpdateAsync(district, cancellationToken);

            return Result.Deleted;
        }
    }

    public class DeleteDistrictCommandValidator : AbstractValidator<DeleteDistrictCommand>
    {
        public DeleteDistrictCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("District ID cannot be empty.");
        }
    }
}
