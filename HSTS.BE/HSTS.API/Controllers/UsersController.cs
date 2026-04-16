using HSTS.API.Common;
using HSTS.Application.Users;
using HSTS.Application.Users.Commands;
using HSTS.Application.Users.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Authorize]
    public class UsersController : BaseApiController
    {
        [HttpGet("me")]
        public async Task<IActionResult> GetMyInfo()
        {
            var result = await Mediator.Send(new GetMyInfoQuery());

            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyInfo(UpdateMyInfoCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPost("me/avatar")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> UploadAvatar([FromForm] AvatarUploadRequest request)
        {
            var file = request.File;
            if (file is null || file.Length == 0)
                return BadRequest(new { message = "File is required." });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var command = new UploadAvatarCommand(ms.ToArray(), file.ContentType, file.FileName);
            var result = await Mediator.Send(command);
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("me/profiles")]
        public IActionResult GetMyProfiles()
        {
            return TravelProfilesDisabled();
        }

        [HttpGet("me/profiles/{profileId:int}")]
        public IActionResult GetMyProfile(int profileId)
        {
            return TravelProfilesDisabled();
        }

        [HttpPost("me/profiles")]
        public IActionResult CreateProfile()
        {
            return TravelProfilesDisabled();
        }

        [HttpPut("me/profiles/{profileId:int}")]
        public IActionResult UpdateProfile(int profileId)
        {
            return TravelProfilesDisabled();
        }

        [HttpDelete("me/profiles/{profileId:int}")]
        public IActionResult DeleteProfile(int profileId)
        {
            return TravelProfilesDisabled();
        }

        [HttpGet]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetUsers([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10, [FromQuery] string? searchTerm = null, [FromQuery] string? role = null, [FromQuery] string? status = null)
        {
            var result = await Mediator.Send(new GetUsersPagingQuery(pageIndex, pageSize, searchTerm, role, status));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("{userId:int}")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetUserById(int userId)
        {
            var result = await Mediator.Send(new GetUserByIdQuery(userId));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPost]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserBody body)
        {
            var result = await Mediator.Send(new AdminCreateUserCommand(body.Email, body.FullName, body.RoleId));
            return result.Match<IActionResult>(value => Ok(new { message = value }), MapErrors);
        }

        [HttpPut("{userId:int}/role")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> ChangeUserRole(int userId, [FromBody] ChangeUserRoleBody body)
        {
            if (userId != body.UserId)
                return BadRequest(new { message = "User ID in route does not match request body." });

            var result = await Mediator.Send(new ChangeUserRoleCommand(body.UserId, body.RoleId));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        [HttpPost("{userId:int}/ban")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> BanUser(int userId)
        {
            var result = await Mediator.Send(new BanUserCommand(userId));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        [HttpPost("{userId:int}/unban")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UnbanUser(int userId)
        {
            var result = await Mediator.Send(new UnbanUserCommand(userId));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        [HttpGet("roles")]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> GetRoles()
        {
            var result = await Mediator.Send(new GetRolesQuery());
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        public record CreateUserBody(string Email, string FullName, int RoleId);
        public record ChangeUserRoleBody(int UserId, int RoleId);

        private IActionResult TravelProfilesDisabled()
        {
            return StatusCode(410, new
            {
                code = "TravelProfiles.Disabled",
                message = "Travel Profiles feature has been disabled."
            });
        }
    }
}
