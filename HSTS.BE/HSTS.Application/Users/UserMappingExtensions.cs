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

        public static UserListItemDto ToListItemDto(this User user, Account account) =>
            new(
                Id: user.Id,
                Email: account.Email,
                FullName: user.FullName,
                PrimaryRole: user.UserRoles
                    .Where(ur => ur.Role is not null)
                    .Select(ur => ur.Role.Name)
                    .OrderBy(name => name)
                    .FirstOrDefault() ?? string.Empty,
                Status: account.Status.ToString(),
                GovernanceState: account.Status.ToString(),
                IsDeleted: user.IsDeleted || account.IsDeleted,
                CreatedAt: user.CreatedAt);

        public static UserAdminDetailDto ToAdminDetailDto(this User user, Account account) =>
            new(
                Id: user.Id,
                Email: account.Email,
                FullName: user.FullName,
                AvatarUrl: user.AvatarUrl,
                Bio: user.Bio,
                DateOfBirth: user.DateOfBirth,
                Gender: user.Gender,
                PhoneNumber: user.PhoneNumber,
                Roles: user.UserRoles.Where(ur => ur.Role is not null).Select(ur => ur.Role.Name).ToList(),
                AccountStatus: account.Status.ToString(),
                GovernanceState: account.Status.ToString(),
                IsDeleted: user.IsDeleted || account.IsDeleted,
                CreatedAt: user.CreatedAt,
                HasPassword: account.PasswordHash != null,
                HasGoogleLinked: account.GoogleId != null);

        public static RoleOptionDto ToRoleOptionDto(this Role role) =>
            new(role.Id, role.Name);
    }
}
