using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Queries
{
    public record LocationSubmissionPagedResponse(IEnumerable<LocationSubmissionDto> Items, int TotalCount);

    public record GetMySubmissionsQuery(
        int UserId,
        SubmissionStatus? Status,
        DateTime? FromDate,
        DateTime? ToDate,
        int PageIndex = 1,
        int PageSize = 10) : IRequest<ErrorOr<LocationSubmissionPagedResponse>>;

    public class GetMySubmissionsQueryHandler : IRequestHandler<GetMySubmissionsQuery, ErrorOr<LocationSubmissionPagedResponse>>
    {
        private readonly IRepository.IRepository<LocationSubmission> _repository;
        private readonly IRepository.IRepository<Tag> _tagRepository;

        public GetMySubmissionsQueryHandler(
            IRepository.IRepository<LocationSubmission> repository,
            IRepository.IRepository<Tag> tagRepository)
        {
            _repository = repository;
            _tagRepository = tagRepository;
        }

        public async Task<ErrorOr<LocationSubmissionPagedResponse>> Handle(GetMySubmissionsQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
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
                .AsQueryable();

            query = query.Where(s => !s.IsDeleted && s.UserId == request.UserId);

            // Filter by status
            if (request.Status.HasValue)
            {
                query = query.Where(s => s.Status == request.Status.Value);
            }

            // Filter by date range (CreatedAt)
            if (request.FromDate.HasValue)
            {
                query = query.Where(s => s.CreatedAt >= request.FromDate.Value);
            }
            if (request.ToDate.HasValue)
            {
                query = query.Where(s => s.CreatedAt <= request.ToDate.Value);
            }

            query = query.OrderByDescending(s => s.CreatedAt);

            var (items, total) = await _repository.GetPagedAsync(
                request.PageIndex,
                request.PageSize,
                query,
                ct);

            // Batch-resolve all tags for all submissions in one query
            var allTagIds = items
                .Where(s => s.TagIdsJson != null)
                .SelectMany(s => System.Text.Json.JsonSerializer.Deserialize<List<int>>(s.TagIdsJson) ?? Enumerable.Empty<int>())
                .Distinct()
                .ToList();

            var allTags = allTagIds.Count > 0
                ? (await _tagRepository.Query()
                    .Where(t => allTagIds.Contains(t.Id) && !t.IsDeleted)
                    .Select(t => new LocationSubmissionTagDto(t.Id, t.Name))
                    .ToListAsync(ct))
                    .ToDictionary(t => t.Id)
                : new Dictionary<int, LocationSubmissionTagDto>();

            // Map submissions with pre-fetched tags
            var submissionDtos = new List<LocationSubmissionDto>();
            foreach (var submission in items)
            {
                var tagIds = submission.TagIdsJson != null
                    ? System.Text.Json.JsonSerializer.Deserialize<List<int>>(submission.TagIdsJson)
                    : null;

                var tags = tagIds != null
                    ? tagIds
                        .Where(id => allTags.ContainsKey(id))
                        .Select(id => allTags[id])
                        .ToList()
                    : null;

                // Map existing location if present
                HSTS.Application.Locations.LocationDto? existingLocationDto = null;
                if (submission.ExistingLocation != null)
                {
                    existingLocationDto = submission.ExistingLocation.ToDto();
                }

                submissionDtos.Add(submission.ToDto(tags, existingLocationDto));
            }

            return new LocationSubmissionPagedResponse(submissionDtos, total);
        }
    }
}
