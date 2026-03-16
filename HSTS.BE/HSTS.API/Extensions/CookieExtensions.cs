using HSTS.Application.Auth.Common;

namespace HSTS.API.Extensions
{
    public static class CookieExtensions
    {
        private const string AccessTokenCookie = "access_token";
        private const string RefreshTokenCookie = "refresh_token";
        private const string XsrfTokenCookie = "XSRF-TOKEN";

        public static void SetAuthCookies(this HttpResponse response, AuthResult authResult, bool isDevelopment)
        {
            // In development, the frontend (http://localhost:5173) and backend (https://localhost:7139)
            // have different schemes, making them cross-site. SameSite=None;Secure is required so
            // the browser sends credentials on cross-site AJAX requests (withCredentials: true).
            // In production, frontend and backend share the same origin so SameSite=Strict is safe.
            var sameSite = isDevelopment ? SameSiteMode.None : SameSiteMode.Strict;
            var secure = true; // SameSite=None requires Secure; backend always runs on HTTPS

            response.Cookies.Append(AccessTokenCookie, authResult.AccessToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Path = "/api",
                Expires = DateTimeOffset.UtcNow.AddMinutes(30)
            });

            response.Cookies.Append(RefreshTokenCookie, authResult.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Path = "/api/auth",
                Expires = authResult.RefreshTokenExpiry
            });

            // Non-HttpOnly CSRF token for the frontend to read and send back as header
            var csrfToken = Guid.NewGuid().ToString("N");
            response.Cookies.Append(XsrfTokenCookie, csrfToken, new CookieOptions
            {
                HttpOnly = false,
                Secure = secure,
                SameSite = sameSite,
                Path = "/",
                Expires = authResult.RefreshTokenExpiry
            });
        }

        public static void ClearAuthCookies(this HttpResponse response, bool isDevelopment)
        {
            var sameSite = isDevelopment ? SameSiteMode.None : SameSiteMode.Strict;
            var secure = true;
            var expiry = DateTimeOffset.UtcNow.AddDays(-1);

            response.Cookies.Append(AccessTokenCookie, "", new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Path = "/api",
                Expires = expiry
            });

            response.Cookies.Append(RefreshTokenCookie, "", new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Path = "/api/auth",
                Expires = expiry
            });

            response.Cookies.Append(XsrfTokenCookie, "", new CookieOptions
            {
                HttpOnly = false,
                Secure = secure,
                SameSite = sameSite,
                Path = "/",
                Expires = expiry
            });
        }

        public static string? GetRefreshTokenFromCookie(this HttpRequest request)
        {
            return request.Cookies["refresh_token"];
        }
    }
}
