using HSTS.Domain.Enums;

namespace HSTS.Application.Auth.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string toEmail, string otpCode, OtpType type, CancellationToken cancellationToken = default);
        Task SendOnboardingLinkEmailAsync(string toEmail, string setupLink, CancellationToken cancellationToken = default);
        Task SendTripInvitationEmailAsync(string toEmail, string inviterName, string tripName, string token, string clientUrl, CancellationToken cancellationToken = default);
    }
}
