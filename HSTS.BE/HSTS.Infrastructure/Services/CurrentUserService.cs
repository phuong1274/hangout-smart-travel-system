using System.Security.Claims;
using HSTS.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace HSTS.Infrastructure.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public int AccountId
        {
            get
            {
                var sub = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                return int.TryParse(sub, out var id) ? id : 0;
            }
        }

        public int UserId
        {
            get
            {
                var userId = _httpContextAccessor.HttpContext?.User.FindFirst("userId")?.Value;
                return int.TryParse(userId, out var id) ? id : 0;
            }
        }
    }
}
