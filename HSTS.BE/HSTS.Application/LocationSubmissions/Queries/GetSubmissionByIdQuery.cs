using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Queries
{
    public record GetSubmissionByIdQuery(int Id) : IRequest<ErrorOr<LocationSubmissionDto>>;

    public class GetSubmissionByIdQueryHandler : IRequestHandler<GetSubmissionByIdQuery, ErrorOr<LocationSubmissionDto>>
    {
        private readonly IRepository.IRepository<LocationSubmission> _repository;
        private readonly IRepository.IRepository<Tag> _tagRepository;

        public GetSubmissionByIdQueryHandler(
            IRepository.IRepository<LocationSubmission> repository,
            IRepository.IRepository<Tag> tagRepository)
        {
            _repository = repository;
            _tagRepository = tagRepository;
        }

        public async Task<ErrorOr<LocationSubmissionDto>> Handle(GetSubmissionByIdQuery request, CancellationToken ct)
        {
            var submission = await _repository.Query()
                .Include(s => s.District)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l.LocationTags)
                    .ThenInclude(lt => lt.Tag)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l.LocationAmenities)
                    .ThenInclude(la => la.Amenity)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l.LocationMedias)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l.SocialLinks)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l.OpeningHours)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l.Seasons)
                .FirstOrDefaultAsync(s => s.Id == request.Id && !s.IsDeleted, ct);

            if (submission is null)
            {
                return Error.NotFound("LocationSubmission.NotFound", $"Submission with ID {request.Id} was not found.");
            }

            // Resolve tag IDs to structured tag objects
            var tagIds = submission.TagIdsJson != null 
                ? System.Text.Json.JsonSerializer.Deserialize<List<int>>(submission.TagIdsJson)
                : null;
            
            var tags = await LocationSubmissionMappingExtensions.ResolveTagsAsync(
                tagIds, 
                _tagRepository, 
                ct);

            // Map existing location if present
            HSTS.Application.Locations.LocationDto? existingLocationDto = null;
            if (submission.ExistingLocation != null)
            {
                existingLocationDto = submission.ExistingLocation.ToDto();
            }

            return submission.ToDto(tags, existingLocationDto);
        }
    }
}
