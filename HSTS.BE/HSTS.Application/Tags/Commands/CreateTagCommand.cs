using ErrorOr;
using MediatR;
using FluentValidation;
using HSTS.Application.Interfaces;
using HSTS.Application.Tags;
using HSTS.Domain.Entities;
using static HSTS.Application.Interfaces.IRepository;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Tags.Commands
{
    public record CreateTagCommand(string Name, int? ParentTagId = null) : IRequest<ErrorOr<TagDto>>;

    public class CreateTagCommandHandler : IRequestHandler<CreateTagCommand, ErrorOr<TagDto>>
    {
        private readonly IRepository<Tag> _repository;

        public CreateTagCommandHandler(IRepository<Tag> repository)
        {
            _repository = repository;
        }

        public async Task<ErrorOr<TagDto>> Handle(CreateTagCommand request, CancellationToken cancellationToken)
        {
            var existingTag = await _repository.Query()
                .Where(x => x.Name == request.Name && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingTag != null)
            {
                return Error.Conflict("Tag.DuplicateName",
                    $"A tag with the name '{request.Name}' already exists.");
            }

            // Determine level based on parent
            int level = 1;
            if (request.ParentTagId.HasValue)
            {
                var parentTag = await _repository.GetAsync(request.ParentTagId.Value, cancellationToken);
                if (parentTag != null)
                {
                    level = parentTag.Level + 1;
                }
            }

            var tag = new Tag 
            { 
                Name = request.Name,
                ParentTagId = request.ParentTagId,
                Level = level
            };

            await _repository.AddAsync(tag, cancellationToken);
            return tag.ToDto();
        }
    }

    public class CreateTagCommandValidator : AbstractValidator<CreateTagCommand>
    {
        public CreateTagCommandValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Tag name cannot be empty.")
                .MaximumLength(100).WithMessage("Tag name cannot exceed 100 characters.");
            
            RuleFor(x => x.ParentTagId)
                .NotEmpty().When(x => x.ParentTagId.HasValue)
                .WithMessage("Parent tag must exist if specified.");
        }
    }
}
