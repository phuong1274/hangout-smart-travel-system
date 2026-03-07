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

        [HttpGet("me/profiles")]
        public async Task<IActionResult> GetMyProfiles()
        {
            var result = await Mediator.Send(new GetMyProfilesQuery());

            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("me/profiles/{profileId:int}")]
        public async Task<IActionResult> GetMyProfile(int profileId)
        {
            var result = await Mediator.Send(new GetMyProfileQuery(profileId));

            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPost("me/profiles")]
        public async Task<IActionResult> CreateProfile(CreateProfileCommand command)
        {
            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(
                value => CreatedAtAction(nameof(GetMyProfile), new { profileId = value.Id }, value),
                MapErrors);
        }

        [HttpPut("me/profiles/{profileId:int}")]
        public async Task<IActionResult> UpdateProfile(int profileId, [FromBody] UpdateProfileCommand command)
        {
            if (profileId != command.ProfileId)
                return BadRequest(new { message = "Profile ID in route does not match request body." });

            var result = await Mediator.Send(command);

            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpDelete("me/profiles/{profileId:int}")]
        public async Task<IActionResult> DeleteProfile(int profileId)
        {
            var result = await Mediator.Send(new DeleteProfileCommand(profileId));

            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }
    }
}
