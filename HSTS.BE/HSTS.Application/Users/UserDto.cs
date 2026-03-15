using HSTS.Domain.Enums;

namespace HSTS.Application.Users
{
    public record UserDto(
        int Id,
        string Email,
        string FullName,
        string? AvatarUrl,
        string? Bio,
        DateTime? DateOfBirth,
        Gender? Gender,
        string? PhoneNumber,
        IList<string> Roles,
        IList<ProfileDto> Profiles,
        bool HasPassword,
        bool HasGoogleLinked);

    public record ProfileDto(
        int Id,
        string ProfileName,
        string? Address,
        string? AvatarUrl);
}
