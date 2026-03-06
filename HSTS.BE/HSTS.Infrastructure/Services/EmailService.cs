using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace HSTS.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task SendOtpEmailAsync(string toEmail, string otpCode, OtpType type, CancellationToken cancellationToken = default)
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var smtpUser = _configuration["Email:SmtpUser"]
                ?? throw new InvalidOperationException("Email SmtpUser is not configured.");
            var smtpPassword = _configuration["Email:SmtpPassword"]
                ?? throw new InvalidOperationException("Email SmtpPassword is not configured.");
            var fromName = _configuration["Email:FromName"] ?? "Hangout - Smart Travel System";

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

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, smtpUser));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = body };

            using var client = new SmtpClient();
            try
            {
                await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, cancellationToken);
                await client.AuthenticateAsync(smtpUser, smtpPassword, cancellationToken);
                await client.SendAsync(message, cancellationToken);
            }
            finally
            {
                await client.DisconnectAsync(true, cancellationToken);
            }

            _logger.LogInformation("OTP email sent to {Email} for {Type}", toEmail, type);
        }
    }
}
