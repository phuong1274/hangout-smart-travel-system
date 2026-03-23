using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Commands
{
    public record UpdateMyInfoCommand(
        string FullName,
        string? Bio,
        DateTime? DateOfBirth,
        Gender? Gender,
        string? PhoneNumber) : IRequest<ErrorOr<UserDto>>;

    public class UpdateMyInfoCommandHandler : IRequestHandler<UpdateMyInfoCommand, ErrorOr<UserDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public UpdateMyInfoCommandHandler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<ErrorOr<UserDto>> Handle(UpdateMyInfoCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .Include(u => u.Account)
                .Include(u => u.Profiles.Where(p => !p.IsDeleted))
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId && !u.IsDeleted, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            user.FullName = request.FullName;
            user.Bio = request.Bio;
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = request.Gender;
            user.PhoneNumber = request.PhoneNumber;

            await _context.SaveChangesAsync(cancellationToken);

            return user.ToDto(user.Account);
        }
    }

    public class UpdateMyInfoCommandValidator : AbstractValidator<UpdateMyInfoCommand>
    {
        public UpdateMyInfoCommandValidator()
        {
            RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Bio).MaximumLength(300).When(x => x.Bio != null);
            RuleFor(x => x.PhoneNumber).MaximumLength(15).When(x => x.PhoneNumber != null);
        }
    }
}
