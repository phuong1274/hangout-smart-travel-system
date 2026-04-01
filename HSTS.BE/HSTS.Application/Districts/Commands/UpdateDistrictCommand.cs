using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Commands
{
    public record UpdateDistrictCommand(
        int Id,
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? ProvinceId
    ) : IRequest<ErrorOr<DistrictDto>>;

    public class UpdateDistrictCommandHandler : IRequestHandler<UpdateDistrictCommand, ErrorOr<DistrictDto>>
    {
        private readonly IRepository<District> _repository;

        public UpdateDistrictCommandHandler(IRepository<District> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<DistrictDto>> Handle(UpdateDistrictCommand request, CancellationToken cancellationToken)
        {
            var district = await _repository.GetAsync(request.Id, cancellationToken);

            if (district is null || district.IsDeleted)
            {
                return Error.NotFound("District.NotFound", $"District with ID {request.Id} not found.");
            }

            var existingDistrict = await _repository.Query()
                .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingDistrict != null)
            {
                return Error.Conflict("District.DuplicateName",
                    $"A district with the name '{request.Name}' already exists.");
            }

            district.Name = request.Name;
            district.EnglishName = request.EnglishName;
            district.Code = request.Code;
            district.Latitude = request.Latitude;
            district.Longitude = request.Longitude;
            district.ProvinceId = request.ProvinceId;

            await _repository.UpdateAsync(district, cancellationToken);
            return district.ToDto();
        }
    }

    public class UpdateDistrictCommandValidator : AbstractValidator<UpdateDistrictCommand>
    {
        public UpdateDistrictCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("District ID cannot be empty.");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("District name cannot be empty.")
                .MaximumLength(200).WithMessage("District name cannot exceed 200 characters.");

            RuleFor(x => x.EnglishName)
                .MaximumLength(200).WithMessage("English name cannot exceed 200 characters.");

            RuleFor(x => x.Code)
                .MaximumLength(50).WithMessage("Code cannot exceed 50 characters.");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue)
                .WithMessage("Latitude must be between -90 and 90.");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue)
                .WithMessage("Longitude must be between -180 and 180.");
        }
    }
}
