namespace HSTS.Application.Auth.Common
{
    public record AuthResult(
        int UserId,
        string FullName,
        string Email,
        IList<string> Roles,
        bool HasPassword,
        bool HasGoogleLinked,
        string AccessToken,
        string RefreshToken,
        DateTime RefreshTokenExpiry);
}
