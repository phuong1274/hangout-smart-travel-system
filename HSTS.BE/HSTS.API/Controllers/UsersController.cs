using HSTS.API.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    // DISABLED: This controller contains deprecated endpoints.
    // Use Profile endpoints for user management instead.
    [Authorize]
    public class UsersController : BaseApiController
    {
        private readonly ISender _mediator;
        public UsersController(ISender mediator) => _mediator = mediator;

        // All endpoints in this controller have been disabled.
        // Use the following endpoints instead:
        // - GET /api/users/me/profiles - Get current user's profiles
        // - POST /api/users/me/profiles - Create a profile
        // - PUT /api/users/me/profiles/{id} - Update a profile
        // - DELETE /api/users/me/profiles/{id} - Delete a profile
    }
}
