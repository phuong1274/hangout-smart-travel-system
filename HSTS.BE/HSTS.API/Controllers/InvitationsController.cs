using HSTS.API.Common;
using HSTS.Application.Invitations.Commands;
using HSTS.Application.Invitations.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Authorize]
    public class InvitationsController : BaseApiController
    {
        /// <summary>
        /// Send an invitation to a user by email for a specific trip.
        /// Only the trip Leader can send invitations.
        /// </summary>
        [HttpPost("/api/trips/{tripId}/invitations")]
        public async Task<IActionResult> CreateInvitation(int tripId, [FromBody] CreateInvitationRequest request, CancellationToken ct)
        {
            var command = new CreateInvitationCommand(tripId, request.Email, request.ClientUrl);
            var result = await Mediator.Send(command, ct);

            if (result.IsError)
                return MapErrors(result.Errors);

            return CreatedAtAction(nameof(VerifyInvitation), new { token = result.Value.Token }, result.Value);
        }

        /// <summary>
        /// Verify an invitation token. Returns trip info if valid.
        /// </summary>
        [HttpGet("verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyInvitation([FromQuery] string token, CancellationToken ct)
        {
            var query = new VerifyInvitationQuery(token);
            var result = await Mediator.Send(query, ct);

            if (result.IsError)
                return MapErrors(result.Errors);

            return Ok(result.Value);
        }

        /// <summary>
        /// Accept or reject an invitation.
        /// Returns "Phone_Number_Required" if phone number is missing on accept.
        /// </summary>
        [HttpPost("{id}/respond")]
        public async Task<IActionResult> RespondToInvitation(int id, [FromBody] RespondInvitationRequest request, CancellationToken ct)
        {
            var command = new RespondInvitationCommand(id, request.IsAccepted);
            var result = await Mediator.Send(command, ct);

            if (result.IsError)
                return MapErrors(result.Errors);

            return Ok(new { message = request.IsAccepted ? "Invitation accepted." : "Invitation rejected." });
        }

        /// <summary>
        /// Get all pending invitations for the current user.
        /// </summary>
        [HttpGet("/api/users/me/invitations")]
        public async Task<IActionResult> GetMyInvitations(CancellationToken ct)
        {
            var query = new GetMyInvitationsQuery();
            var result = await Mediator.Send(query, ct);

            if (result.IsError)
                return MapErrors(result.Errors);

            return Ok(result.Value);
        }
    }

    public record CreateInvitationRequest(string Email, string ClientUrl);
    public record RespondInvitationRequest(bool IsAccepted);
}
