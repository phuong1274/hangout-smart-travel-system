namespace HSTS.API.Common
{
    public record AuthResponse(
        int UserId,
        string FullName,
        string Email,
        IList<string> Roles,
        bool HasPassword,
        bool HasGoogleLinked);
}
