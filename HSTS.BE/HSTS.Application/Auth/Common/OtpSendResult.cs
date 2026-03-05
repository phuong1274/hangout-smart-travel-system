namespace HSTS.Application.Auth.Common
{
    public record OtpSendResult(string Message, int RemainingResends, int CooldownSeconds);
}
