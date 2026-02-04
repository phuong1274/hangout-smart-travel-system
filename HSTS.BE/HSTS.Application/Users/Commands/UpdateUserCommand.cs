using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Users.Commands
{
    public record UpdateUserCommand(int Id, string FullName, string Email) : IRequest<ErrorOr<UserDto>>;

    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ErrorOr<UserDto>>
    {
        private readonly IRepository<User> _repository;
        public UpdateUserCommandHandler(IRepository<User> repository) => _repository = repository;

        public async Task<ErrorOr<UserDto>> Handle(UpdateUserCommand request, CancellationToken ct)
        {
            var user = await _repository.GetAsync(request.Id, ct);
            if (user is null) return Error.NotFound();

            user.FullName = request.FullName;
            user.Email = request.Email;

            await _repository.UpdateAsync(user, ct);
            return user.ToDto();
        }
    }

    public class UpdateUserCommandValidator : AbstractValidator<CreateUserCommand>
    {
        public UpdateUserCommandValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Not empty")
                .MaximumLength(100).WithMessage("Name have max length is 100.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Not empty")
                .EmailAddress().WithMessage("Email is invalid.");
        }
    }
}
