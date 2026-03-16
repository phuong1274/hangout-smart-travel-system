using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.LocationSubmissions.Commands
{
    public record DeleteLocationSubmissionCommand(int Id, string UserId) : IRequest<ErrorOr<Deleted>>;

    public class DeleteLocationSubmissionCommandHandler : IRequestHandler<DeleteLocationSubmissionCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<LocationSubmission> _repository;

        public DeleteLocationSubmissionCommandHandler(IRepository<LocationSubmission> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<Deleted>> Handle(DeleteLocationSubmissionCommand request, CancellationToken cancellationToken)
        {
            var submission = await _repository.GetAsync(request.Id, cancellationToken);

            if (submission == null || submission.IsDeleted)
            {
                return Error.NotFound("LocationSubmission.NotFound", $"Submission with ID {request.Id} was not found.");
            }

            // Check if user owns this submission
            if (submission.UserId != request.UserId)
            {
                return Error.Forbidden("LocationSubmission.NotOwner", "You can only delete your own submissions.");
            }

            // Only pending or rejected submissions can be deleted
            if (submission.Status == Domain.Entities.SubmissionStatus.Approved || 
                submission.Status == Domain.Entities.SubmissionStatus.Published)
            {
                return Error.Conflict("LocationSubmission.CannotDelete", 
                    "Approved or published submissions cannot be deleted. Please contact admin.");
            }

            submission.IsDeleted = true;
            await _repository.UpdateAsync(submission, cancellationToken);

            return new Deleted();
        }
    }

    public class DeleteLocationSubmissionCommandValidator : AbstractValidator<DeleteLocationSubmissionCommand>
    {
        public DeleteLocationSubmissionCommandValidator()
        {
            RuleFor(x => x.Id).NotEmpty();
            RuleFor(x => x.UserId).NotEmpty();
        }
    }
}
