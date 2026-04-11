using HSTS.Application.Interfaces;
using HSTS.Application.Locations;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Queries
{
    public record GetAllSubmissionsPagingQuery(
        string? SearchTerm,
        SubmissionStatus? Status,
        DateTime? FromDate,
        DateTime? ToDate,
        int PageIndex = 1,
        int PageSize = 10) : IRequest<ErrorOr<LocationSubmissionPagedResponse>>;

    public class GetAllSubmissionsPagingQueryHandler : IRequestHandler<GetAllSubmissionsPagingQuery, ErrorOr<LocationSubmissionPagedResponse>>
    {
        private readonly IRepository.IRepository<LocationSubmission> _repository;
        private readonly IRepository.IRepository<Tag> _tagRepository;

        public GetAllSubmissionsPagingQueryHandler(
            IRepository.IRepository<LocationSubmission> repository,
            IRepository.IRepository<Tag> tagRepository)
        {
            _repository = repository;
            _tagRepository = tagRepository;
        }

        public async Task<ErrorOr<LocationSubmissionPagedResponse>> Handle(GetAllSubmissionsPagingQuery request, CancellationToken ct)
        {
            var query = _repository.Query()
                .Include(s => s.District)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l!.LocationTags)
                    .ThenInclude(lt => lt!.Tag)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l!.LocationAmenities)
                    .ThenInclude(la => la!.Amenity)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l!.LocationMedias)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l!.SocialLinks)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l!.OpeningHours)
                .Include(s => s.ExistingLocation)
                    .ThenInclude(l => l!.Seasons)
                .AsQueryable();

            query = query.Where(s => !s.IsDeleted);

            if (request.Status.HasValue)
            {
                query = query.Where(s => s.Status == request.Status.Value);
            }

            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                var searchTerm = request.SearchTerm.ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(searchTerm) ||
                    (s.Description != null && s.Description.ToLower().Contains(searchTerm)) ||
                    s.Address.ToLower().Contains(searchTerm));
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

            // Resolve tags and existing location for each submission
            var submissionDtos = new List<LocationSubmissionDto>();
            foreach (var submission in items)
            {
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

                submissionDtos.Add(submission.ToDto(tags, existingLocationDto));
            }

            return new LocationSubmissionPagedResponse(submissionDtos, total);
        }
    }
}
