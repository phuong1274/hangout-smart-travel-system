using ErrorOr;
using FluentValidation;
using HSTS.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Users.Commands
{
    public record UploadAvatarCommand(
        byte[] FileBytes,
        string ContentType,
        string FileName) : IRequest<ErrorOr<UserDto>>;

    public class UploadAvatarCommandHandler : IRequestHandler<UploadAvatarCommand, ErrorOr<UserDto>>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly ICloudinaryService _cloudinary;

        public UploadAvatarCommandHandler(
            IAppDbContext context,
            ICurrentUserService currentUser,
            ICloudinaryService cloudinary)
        {
            _context = context;
            _currentUser = currentUser;
            _cloudinary = cloudinary;
        }

        public async Task<ErrorOr<UserDto>> Handle(UploadAvatarCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users
                .Include(u => u.Account)
                .Include(u => u.Profiles.Where(p => !p.IsDeleted))
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId && !u.IsDeleted, cancellationToken);

            if (user is null)
                return Error.NotFound("User.NotFound", "User not found.");

            var url = await _cloudinary.UploadImageAsync(
                request.FileBytes,
                request.ContentType,
                request.FileName,
                user.AvatarUrl);

            user.AvatarUrl = url;
            await _context.SaveChangesAsync(cancellationToken);

            return user.ToDto(user.Account);
        }
    }

    public class UploadAvatarCommandValidator : AbstractValidator<UploadAvatarCommand>
    {
        public UploadAvatarCommandValidator()
        {
            // Defense-in-depth — also enforced by [RequestSizeLimit] on controller
            RuleFor(x => x.FileBytes).NotNull().NotEmpty();
            RuleFor(x => x.ContentType)
                .Must(ct => ct != null && ct.StartsWith("image/"))
                .WithMessage("File must be an image.")
                .WithErrorCode("Validation.InvalidFileType");
            RuleFor(x => x.FileBytes)
                .Must(b => b.Length <= 5_242_880)
                .WithMessage("File size must not exceed 5 MB.")
                .WithErrorCode("Validation.FileTooLarge");
        }
    }
}
