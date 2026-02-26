using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Tags;
using HSTS.Domain.Entities;
using static HSTS.Application.Interfaces.IRepository;
using Microsoft.EntityFrameworkCore; // Re-added for DbUpdateException and FirstOrDefaultAsync

namespace HSTS.Application.Tags.Commands
{
    public record CreateTagCommand(string Name) : IRequest<ErrorOr<TagDto>>;

    public class CreateTagCommandHandler : IRequestHandler<CreateTagCommand, ErrorOr<TagDto>>
    {
        private readonly IRepository<Tag> _repository;

        public CreateTagCommandHandler(IRepository<Tag> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<TagDto>> Handle(CreateTagCommand request, CancellationToken cancellationToken)
        {
            var tag = new Tag { Name = request.Name };
            try
            {
                await _repository.AddAsync(tag, cancellationToken);
                return tag.ToDto();
            }
            catch (DbUpdateException) // User's preferred implementation for unique constraint violation
            {
                return Error.Conflict("Tag.DuplicateName",
                    $"A tag with the name '{request.Name}' already exists.");
            }
        }
    }

    public class CreateTagCommandValidator : AbstractValidator<CreateTagCommand>
    {
        public CreateTagCommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Tag name cannot be empty.")
                .MaximumLength(100).WithMessage("Tag name cannot exceed 100 characters.");
        }
    }

    public record UpdateTagCommand(int Id, string Name) : IRequest<ErrorOr<TagDto>>;

    public class UpdateTagCommandHandler : IRequestHandler<UpdateTagCommand, ErrorOr<TagDto>>
    {
        private readonly IRepository<Tag> _repository;

        public UpdateTagCommandHandler(IRepository<Tag> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<TagDto>> Handle(UpdateTagCommand request, CancellationToken cancellationToken)
        {
            var tag = await _repository.GetAsync(request.Id, cancellationToken);

            if (tag is null)
            {
                return Error.NotFound("Tag.NotFound", $"Tag with ID {request.Id} not found.");
            }

            // Check if another tag with the same name (and not deleted) already exists
            // This check should exclude the current tag being updated
            var existingTagWithSameName = await _repository.Query()
                                                          .Where(t => t.Id != request.Id && t.Name == request.Name && !t.IsDeleted)
                                                          .FirstOrDefaultAsync(cancellationToken);

            if (existingTagWithSameName != null)
            {
                return Error.Conflict("Tag.DuplicateName", $"Another tag with the name '{request.Name}' already exists.");
            }

            tag.Name = request.Name;
            await _repository.UpdateAsync(tag, cancellationToken);
            return tag.ToDto();
        }
    }

    public class UpdateTagCommandValidator : AbstractValidator<UpdateTagCommand>
    {
        public UpdateTagCommandValidator()
        {
            RuleFor(x => x.Id)
                .NotEmpty().WithMessage("Tag ID cannot be empty.");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Tag name cannot be empty.")
                .MaximumLength(100).WithMessage("Tag name cannot exceed 100 characters.");
        }
    }
}
