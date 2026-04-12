using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HSTS.Application.Expenses;
using HSTS.Application.Expenses.Commands;
using HSTS.Application.Expenses.Queries;
using HSTS.Application.Trips.Commands;
using HSTS.Domain.Enums;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripMembersController : ControllerBase
    {
        private readonly ISender _mediator;

        public TripMembersController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTripMember(int id, CancellationToken ct)
        {
            var query = new GetTripMemberByIdQuery(id);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetTripMembersByTrip(int tripId, CancellationToken ct)
        {
            var query = new GetTripMembersByTripQuery(tripId);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return Problem(result.FirstError.Description);
            }

            return Ok(result.Value);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTripMember([FromBody] CreateTripMemberCommand command, CancellationToken ct)
        {
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return CreatedAtAction(nameof(GetTripMember), new { id = result.Value.Id }, result.Value);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTripMember(int id, [FromBody] UpdateTripMemberCommand command, CancellationToken ct)
        {
            if (id != command.MemberId)
            {
                return BadRequest("ID mismatch.");
            }

            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTripMember(int id, CancellationToken ct)
        {
            var command = new DeleteTripMemberCommand(id);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return NoContent();
        }

        /// <summary>
        /// Remove a member from the trip. Only the Leader can remove.
        /// Leader cannot remove themselves.
        /// </summary>
        [Authorize]
        [HttpDelete("/api/trips/{tripId}/members/{userId}")]
        public async Task<IActionResult> RemoveTripMemberByLeader(int tripId, int userId, CancellationToken ct)
        {
            var command = new RemoveTripMemberCommand(tripId, userId);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => StatusCode(403, result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(new { message = "Member removed successfully." });
        }

        /// <summary>
        /// Change a member's role. Uses DB transaction for Leader transfer and Treasurer uniqueness.
        /// </summary>
        [Authorize]
        [HttpPut("/api/trips/{tripId}/members/{userId}/role")]
        public async Task<IActionResult> ChangeMemberRole(int tripId, int userId, [FromBody] ChangeRoleRequest request, CancellationToken ct)
        {
            if (!Enum.TryParse<TripRole>(request.NewRole, true, out var newRole))
                return BadRequest("Invalid role value.");

            var command = new ChangeTripMemberRoleCommand(tripId, userId, newRole);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => StatusCode(403, result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(new { message = "Role updated successfully." });
        }

        /// <summary>
        /// Get detailed member list for a trip.
        /// </summary>
        [Authorize]
        [HttpGet("/api/trips/{tripId}/members/detail")]
        public async Task<IActionResult> GetTripMembersDetail(int tripId, CancellationToken ct)
        {
            var query = new GetTripMembersQuery(tripId);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return Problem(result.FirstError.Description);
            }

            return Ok(result.Value);
        }
    }

    public record ChangeRoleRequest(string NewRole);
}
