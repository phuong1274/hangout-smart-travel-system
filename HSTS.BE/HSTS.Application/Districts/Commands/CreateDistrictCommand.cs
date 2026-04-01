using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Districts.Commands
{
    public record CreateDistrictCommand(
        string Name,
        string? EnglishName,
        string? Code,
        double? Latitude,
        double? Longitude,
        int? ProvinceId
    ) : IRequest<ErrorOr<DistrictDto>>;

    public class CreateDistrictCommandHandler : IRequestHandler<CreateDistrictCommand, ErrorOr<DistrictDto>>
    {
        private readonly IRepository<District> _repository;

        public CreateDistrictCommandHandler(IRepository<District> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<DistrictDto>> Handle(CreateDistrictCommand request, CancellationToken cancellationToken)
        {
            var existingDistrict = await _repository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingDistrict != null)
            {
                return Error.Conflict("District.DuplicateName",
                    $"A district with the name '{request.Name}' already exists.");
            }

            var district = new District
            {
                Name = request.Name,
                EnglishName = request.EnglishName,
                Code = request.Code,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                ProvinceId = request.ProvinceId
            };

            await _repository.AddAsync(district, cancellationToken);
            return district.ToDto();
        }
    }

    public class CreateDistrictCommandValidator : AbstractValidator<CreateDistrictCommand>
    {
        public CreateDistrictCommandValidator()
        {
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
