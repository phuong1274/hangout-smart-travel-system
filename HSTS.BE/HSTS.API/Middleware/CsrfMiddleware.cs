namespace HSTS.API.Middleware
{
    public class CsrfMiddleware
    {
        private readonly RequestDelegate _next;

        private static readonly HashSet<string> SafeMethods = new(StringComparer.OrdinalIgnoreCase)
        {
            "GET", "HEAD", "OPTIONS"
        };

        private static readonly HashSet<string> ExemptPaths = new(StringComparer.OrdinalIgnoreCase)
        {
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/google-login",
            "/api/auth/verify-email",
            "/api/auth/resend-otp",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/refresh-token"
        };

        public CsrfMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (SafeMethods.Contains(context.Request.Method))
            {
                await _next(context);
                return;
            }

            var path = context.Request.Path.Value ?? "";
            if (ExemptPaths.Contains(path))
            {
                await _next(context);
                return;
            }

            // Only validate CSRF if the request has an auth cookie (cookie-based auth)
            if (!context.Request.Cookies.ContainsKey("access_token"))
            {
                await _next(context);
                return;
            }

            var cookieToken = context.Request.Cookies["XSRF-TOKEN"];
            var headerToken = context.Request.Headers["X-XSRF-TOKEN"].FirstOrDefault();

            if (string.IsNullOrEmpty(cookieToken) || string.IsNullOrEmpty(headerToken) || cookieToken != headerToken)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { message = "CSRF token validation failed." });
                return;
            }

            await _next(context);
        }
    }
}
