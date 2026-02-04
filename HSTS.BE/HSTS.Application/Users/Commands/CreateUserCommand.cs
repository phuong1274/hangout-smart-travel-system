using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Users.Commands
{
    public record CreateUserCommand(string FullName, string Email) : IRequest<ErrorOr<UserDto>>;

    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, ErrorOr<UserDto>>
    {
        private readonly IRepository<User> _repository;
        public CreateUserCommandHandler(IRepository<User> repository) => _repository = repository;

        public async Task<ErrorOr<UserDto>> Handle(CreateUserCommand request, CancellationToken ct)
        {
            var user = new User { FullName = request.FullName, Email = request.Email };
            await _repository.AddAsync(user, ct);
            return user.ToDto();
        }
    }
    public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
    {
        public CreateUserCommandValidator()
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
