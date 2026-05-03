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
                OtpType.OnboardingPasswordSetup => "Complete Your Account Setup - Hangout",
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
                OtpType.OnboardingPasswordSetup =>
                    $"<h2>Welcome to Hangout!</h2>" +
                    $"<p>Your account has been created. Use this code to finish setting your password:</p>" +
                    $"<h1 style='color: #3F51B5; letter-spacing: 8px;'>{otpCode}</h1>" +
                    $"<p>This code will expire in 5 minutes.</p>",
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

        public async Task SendOnboardingLinkEmailAsync(string toEmail, string setupLink, CancellationToken cancellationToken = default)
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

            using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
            request.Content = JsonContent.Create(new ResendEmailRequest(
                From: $"{_settings.FromName} <{_settings.FromEmail}>",
                To: new[] { toEmail },
                Subject: "Complete Your Account Setup - Hangout",
                Html:
                    $"<h2>Welcome to Hangout!</h2>" +
                    $"<p>Click the button below to set your password and activate your account:</p>" +
                    $"<p><a href='{setupLink}' style='display:inline-block;padding:12px 20px;background:#3F51B5;color:#fff;text-decoration:none;border-radius:6px;'>Set your password</a></p>" +
                    $"<p>If the button does not work, open this link:</p><p>{setupLink}</p>"));

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadFromJsonAsync<ResendErrorResponse>(cancellationToken: cancellationToken);
                var errorCode = error?.Name ?? "unknown_resend_error";
                var errorMessage = error?.Message ?? "Resend email request failed.";
                throw new InvalidOperationException($"Resend send failed: {errorCode} - {errorMessage}");
            }

            _logger.LogInformation("Onboarding link email sent to {Email}", toEmail);
        }

        public async Task SendTripInvitationEmailAsync(string toEmail, string inviterName, string tripName, string token, string clientUrl, CancellationToken cancellationToken = default)
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

            var invitationLink = $"{clientUrl.TrimEnd('/')}/invitations/accept?token={token}";

            using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
            request.Content = JsonContent.Create(new ResendEmailRequest(
                From: $"{_settings.FromName} <{_settings.FromEmail}>",
                To: new[] { toEmail },
                Subject: $"{inviterName} invited you to {tripName} - Hangout",
                Html:
                    $"<h2>You've been invited!</h2>" +
                    $"<p><strong>{inviterName}</strong> has invited you to join the trip <strong>{tripName}</strong> on Hangout.</p>" +
                    $"<p>Click the button below to accept or decline this invitation:</p>" +
                    $"<p><a href='{invitationLink}' style='display:inline-block;padding:12px 20px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:6px;'>View Invitation</a></p>" +
                    $"<p>If the button does not work, open this link:</p><p>{invitationLink}</p>" +
                    $"<p>This invitation will expire in 3 days.</p>"));

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadFromJsonAsync<ResendErrorResponse>(cancellationToken: cancellationToken);
                var errorCode = error?.Name ?? "unknown_resend_error";
                var errorMessage = error?.Message ?? "Resend email request failed.";
                _logger.LogWarning("Failed to send trip invitation email to {Email}. Code: {Code}. Message: {Message}", toEmail, errorCode, errorMessage);
                // Don't throw — invitation is still created, email is best-effort
                return;
            }

            _logger.LogInformation("Trip invitation email sent to {Email} for trip {TripName}", toEmail, tripName);
        }

        private sealed record ResendEmailRequest(string From, string[] To, string Subject, string Html);

        private sealed record ResendErrorResponse(
            [property: JsonPropertyName("name")] string? Name,
            [property: JsonPropertyName("message")] string? Message);
    }
}
