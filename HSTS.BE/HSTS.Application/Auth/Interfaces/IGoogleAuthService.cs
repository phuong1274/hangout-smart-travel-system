namespace HSTS.Application.Auth.Interfaces
{
    public record GoogleUserInfo(string Email, string GoogleId, string Name);

    public interface IGoogleAuthService
    {
        Task<GoogleUserInfo?> VerifyGoogleTokenAsync(string idToken, CancellationToken cancellationToken = default);
    }
}
