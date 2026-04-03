using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Commands
{
    public record UpdateTagCommand(int Id, string Name, int? ParentTagId = null) : IRequest<ErrorOr<TagDto>>;

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

            if (tag is null || tag.IsDeleted)
            {
                return Error.NotFound("Tag.NotFound", $"Tag with ID {request.Id} not found.");
            }

            // Check for duplicate name (excluding current tag)
            var existingTag = await _repository.Query()
               .Where(x => x.Name == request.Name && x.Id != request.Id && !x.IsDeleted)
               .FirstOrDefaultAsync(cancellationToken);

            if (existingTag != null)
            {
                return Error.Conflict("Tag.DuplicateName",
                    $"A tag with the name '{request.Name}' already exists.");
            }

            // Prevent circular reference (can't set parent to self or child)
            if (request.ParentTagId.HasValue)
            {
                if (request.ParentTagId.Value == request.Id)
                {
                    return Error.Validation("Tag.CircularReference",
                        "A tag cannot be its own parent.");
                }

                var parentTag = await _repository.GetAsync(request.ParentTagId.Value, cancellationToken);
                if (parentTag != null)
                {
                    // Check if trying to set a child as parent (would create cycle)
                    if (IsChildOf(parentTag, tag, cancellationToken))
                    {
                        return Error.Validation("Tag.CircularReference",
                            "Cannot set a child tag as parent. This would create a circular reference.");
                    }

                    tag.Level = parentTag.Level + 1;
                }
            }
            else
            {
                tag.Level = 1; // Root level
            }

            tag.Name = request.Name;
            tag.ParentTagId = request.ParentTagId;
            
            await _repository.UpdateAsync(tag, cancellationToken);
            return tag.ToDto();
        }

        private bool IsChildOf(Tag potentialParent, Tag potentialChild, CancellationToken ct)
        {
            if (potentialParent.Id == potentialChild.Id)
                return true;
            
            if (potentialParent.ParentTagId == potentialChild.Id)
                return true;
            
            // Recursively check up the tree
            if (potentialParent.ParentTagId.HasValue)
            {
                var grandParent = _repository.GetAsync(potentialParent.ParentTagId.Value, ct).Result;
                if (grandParent != null)
                {
                    return IsChildOf(grandParent, potentialChild, ct);
                }
            }
            
            return false;
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
