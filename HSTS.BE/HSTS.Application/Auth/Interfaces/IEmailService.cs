using HSTS.Domain.Enums;

namespace HSTS.Application.Auth.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string toEmail, string otpCode, OtpType type, CancellationToken cancellationToken = default);
    }
}
