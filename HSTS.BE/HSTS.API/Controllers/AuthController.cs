using HSTS.API.Common;
using HSTS.API.Extensions;
using HSTS.Application.Auth.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Route("api/auth")]
    public class AuthController : BaseApiController
    {
        private readonly IWebHostEnvironment _env;

        public AuthController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value => Ok(new { message = value }),
                MapErrors);
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail(VerifyEmailCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value => Ok(new { message = value }),
                MapErrors);
        }

        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp(ResendOtpCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value => Ok(new
                {
                    message = value.Message,
                    remainingResends = value.RemainingResends,
                    cooldownSeconds = value.CooldownSeconds
                }),
                MapErrors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                authResult =>
                {
                    Response.SetAuthCookies(authResult, _env.IsDevelopment());

                    return Ok(new AuthResponse(
                        UserId: authResult.UserId,
                        FullName: authResult.FullName,
                        Email: authResult.Email,
                        Roles: authResult.Roles,
                        HasPassword: authResult.HasPassword,
                        HasGoogleLinked: authResult.HasGoogleLinked));
                },
                errors =>
                {
                    var first = errors.First();

                    // Return structured response for unverified email so FE can redirect
                    if (first.Code == "Account.EmailNotVerified")
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            code = first.Code,
                            message = first.Description
                        });
                    }

                    return MapErrors(errors);
                });
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin(GoogleLoginCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                authResult =>
                {
                    Response.SetAuthCookies(authResult, _env.IsDevelopment());

                    return Ok(new AuthResponse(
                        UserId: authResult.UserId,
                        FullName: authResult.FullName,
                        Email: authResult.Email,
                        Roles: authResult.Roles,
                        HasPassword: authResult.HasPassword,
                        HasGoogleLinked: authResult.HasGoogleLinked));
                },
                MapErrors);
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value => Ok(new
                {
                    message = value.Message,
                    remainingResends = value.RemainingResends,
                    cooldownSeconds = value.CooldownSeconds
                }),
                MapErrors);
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value => Ok(new { message = value }),
                MapErrors);
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.GetRefreshTokenFromCookie();

            if (string.IsNullOrEmpty(refreshToken))
                return Unauthorized(new { message = "No refresh token provided." });

            var result = await Mediator.Send(new RefreshTokenCommand(refreshToken));

            return result.Match<IActionResult>(
                authResult =>
                {
                    Response.SetAuthCookies(authResult, _env.IsDevelopment());

                    return Ok(new AuthResponse(
                        UserId: authResult.UserId,
                        FullName: authResult.FullName,
                        Email: authResult.Email,
                        Roles: authResult.Roles,
                        HasPassword: authResult.HasPassword,
                        HasGoogleLinked: authResult.HasGoogleLinked));
                },
                MapErrors);
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.GetRefreshTokenFromCookie();

            if (!string.IsNullOrEmpty(refreshToken))
                await Mediator.Send(new LogoutCommand(refreshToken));

            Response.ClearAuthCookies(_env.IsDevelopment());

            return Ok(new { message = "Logged out successfully." });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value =>
                {
                    Response.ClearAuthCookies(_env.IsDevelopment());
                    return Ok(new { message = value });
                },
                MapErrors);
        }
    }
}
