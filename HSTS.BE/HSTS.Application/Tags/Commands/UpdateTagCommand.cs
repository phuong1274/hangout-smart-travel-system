using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Tags.Commands
{
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
