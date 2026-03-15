using HSTS.Domain.Entities;

namespace HSTS.Application.Users
{
    public static class UserMappingExtensions
    {
        public static UserDto ToDto(this User user, Account account) =>
            new(
                Id: user.Id,
                Email: account.Email,
                FullName: user.FullName,
                AvatarUrl: user.AvatarUrl,
                Bio: user.Bio,
                DateOfBirth: user.DateOfBirth,
                Gender: user.Gender,
                PhoneNumber: user.PhoneNumber,
                Roles: user.UserRoles.Select(ur => ur.Role.Name).ToList(),
                Profiles: user.Profiles.Where(p => !p.IsDeleted).Select(p => p.ToDto()).ToList(),
                HasPassword: account.PasswordHash != null,
                HasGoogleLinked: account.GoogleId != null);

        public static ProfileDto ToDto(this Profile profile) =>
            new(
                Id: profile.Id,
                ProfileName: profile.ProfileName,
                Address: profile.Address,
                AvatarUrl: profile.AvatarUrl);
    }
}
