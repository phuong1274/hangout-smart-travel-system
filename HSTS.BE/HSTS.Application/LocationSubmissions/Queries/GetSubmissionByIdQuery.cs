using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Queries
{
    public record GetSubmissionByIdQuery(int Id) : IRequest<ErrorOr<LocationSubmissionDto>>;

    public class GetSubmissionByIdQueryHandler : IRequestHandler<GetSubmissionByIdQuery, ErrorOr<LocationSubmissionDto>>
    {
        private readonly IRepository<LocationSubmission> _repository;

        public GetSubmissionByIdQueryHandler(IRepository<LocationSubmission> repository)
            => _repository = repository;

        public async Task<ErrorOr<LocationSubmissionDto>> Handle(GetSubmissionByIdQuery request, CancellationToken ct)
        {
            var submission = await _repository.Query()
                .Include(s => s.Destination)
                .Include(s => s.LocationType)
                .FirstOrDefaultAsync(s => s.Id == request.Id && !s.IsDeleted, ct);

            if (submission is null)
            {
                return Error.NotFound("LocationSubmission.NotFound", $"Submission with ID {request.Id} was not found.");
            }

            return submission.ToDto();
        }
    }
}
