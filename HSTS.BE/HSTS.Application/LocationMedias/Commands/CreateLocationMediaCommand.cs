using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationMedias.Commands
{
    public record CreateLocationMediaCommand(List<string> Links, int LocationId) : IRequest<ErrorOr<List<LocationMediaDto>>>;

    public class CreateLocationMediaCommandHandler : IRequestHandler<CreateLocationMediaCommand, ErrorOr<List<LocationMediaDto>>>
    {
        private readonly IRepository<LocationMedia> _mediaRepository;
        private readonly IRepository<Location> _locationRepository;

        public CreateLocationMediaCommandHandler(
            IRepository<LocationMedia> mediaRepository,
            IRepository<Location> locationRepository)
        {
            _mediaRepository = mediaRepository;
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<List<LocationMediaDto>>> Handle(CreateLocationMediaCommand request, CancellationToken cancellationToken)
        {
            var location = await _locationRepository.GetAsync(request.LocationId, cancellationToken);
            if (location == null || location.IsDeleted)
            {
                return Error.NotFound("Location.NotFound", $"Location with ID {request.LocationId} was not found.");
            }

            var mediaList = request.Links.Select(link => new LocationMedia
            {
                Link = link,
                LocationId = request.LocationId
            }).ToList();

            foreach (var media in mediaList)
            {
                await _mediaRepository.AddAsync(media, cancellationToken);
            }

            return mediaList.Select(m => m.ToDto()).ToList();
        }
    }

    public class CreateLocationMediaCommandValidator : AbstractValidator<CreateLocationMediaCommand>
    {
        public CreateLocationMediaCommandValidator()
        {
            RuleFor(x => x.Links).NotEmpty().WithMessage("At least one link must be provided.");
            RuleForEach(x => x.Links).NotEmpty().MaximumLength(2000);
            RuleFor(x => x.LocationId).NotEmpty();
        }
    }
}
