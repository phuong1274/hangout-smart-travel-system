using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace HSTS.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly HttpClient _httpClient;
        private readonly ResendSettings _settings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(HttpClient httpClient, IOptions<ResendSettings> settings, ILogger<EmailService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task SendOtpEmailAsync(string toEmail, string otpCode, OtpType type, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                _logger.LogError("Resend API key is not configured.");
                throw new InvalidOperationException("Resend API key is not configured.");
            }

            if (string.IsNullOrWhiteSpace(_settings.FromEmail))
            {
                _logger.LogError("Resend sender email is not configured.");
                throw new InvalidOperationException("Resend sender email is not configured.");
            }

            var subject = type switch
            {
                OtpType.EmailVerification => "Verify Your Email - Hangout",
                OtpType.ForgotPassword => "Reset Your Password - Hangout",
                _ => "Your OTP Code - Hangout"
            };

            var body = type switch
            {
                OtpType.EmailVerification =>
                    $"<h2>Welcome to Hangout!</h2>" +
                    $"<p>Your email verification code is:</p>" +
                    $"<h1 style='color: #4CAF50; letter-spacing: 8px;'>{otpCode}</h1>" +
                    $"<p>This code will expire in 5 minutes.</p>",
                OtpType.ForgotPassword =>
                    $"<h2>Password Reset Request</h2>" +
                    $"<p>Your password reset code is:</p>" +
                    $"<h1 style='color: #FF5722; letter-spacing: 8px;'>{otpCode}</h1>" +
                    $"<p>This code will expire in 5 minutes.</p>" +
                    $"<p>If you didn't request this, please ignore this email.</p>",
                _ =>
                    $"<h2>Your OTP Code</h2>" +
                    $"<h1 style='letter-spacing: 8px;'>{otpCode}</h1>" +
                    $"<p>This code will expire in 5 minutes.</p>"
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
            request.Content = JsonContent.Create(new ResendEmailRequest(
                From: $"{_settings.FromName} <{_settings.FromEmail}>",
                To: new[] { toEmail },
                Subject: subject,
                Html: body));

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadFromJsonAsync<ResendErrorResponse>(cancellationToken: cancellationToken);
                var errorCode = error?.Name ?? "unknown_resend_error";
                var errorMessage = error?.Message ?? "Resend email request failed.";

                if (errorCode is "daily_quota_exceeded" or "monthly_quota_exceeded" or "rate_limit_exceeded")
                {
                    _logger.LogWarning(
                        "Resend quota/rate limit error while sending OTP email to {Email}. Code: {Code}. Message: {Message}",
                        toEmail,
                        errorCode,
                        errorMessage);
                }
                else if (errorCode is "missing_api_key" or "invalid_api_key")
                {
                    _logger.LogError(
                        "Resend authentication/configuration error while sending OTP email to {Email}. Code: {Code}. Message: {Message}",
                        toEmail,
                        errorCode,
                        errorMessage);
                }
                else
                {
                    _logger.LogError(
                        "Resend provider HTTP failure while sending OTP email to {Email}. Status: {StatusCode}. Code: {Code}. Message: {Message}",
                        toEmail,
                        (int)response.StatusCode,
                        errorCode,
                        errorMessage);
                }

                throw new InvalidOperationException($"Resend send failed: {errorCode} - {errorMessage}");
            }

            _logger.LogInformation("OTP email sent to {Email} for {Type}", toEmail, type);
        }

        private sealed record ResendEmailRequest(string From, string[] To, string Subject, string Html);

        private sealed record ResendErrorResponse(
            [property: JsonPropertyName("name")] string? Name,
            [property: JsonPropertyName("message")] string? Message);
    }
}
