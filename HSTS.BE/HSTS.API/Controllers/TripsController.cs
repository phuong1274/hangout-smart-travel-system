using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HSTS.Application.Trips;
using HSTS.Application.Trips.Commands;
using HSTS.Application.Trips.Queries;
using HSTS.Application.TripActivities.Commands;
using HSTS.Domain.Enums;
using HSTS.API.Common;
using HSTS.Application.Trips.Dtos;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripsController : ControllerBase
    {
        private readonly ISender _mediator;

        public TripsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTrip(int id, CancellationToken ct)
        {
            var query = new GetTripByIdQuery(id);
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

        [HttpGet("{id}/detail")]
        public async Task<IActionResult> GetTripDetail(int id, CancellationToken ct)
        {
            var query = new GetTripDetailQuery(id);
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

        [HttpGet("profile/{profileId}")]
        public async Task<IActionResult> GetTripsByProfile(int profileId, CancellationToken ct)
        {
            var query = new GetTripsByProfileQuery(profileId);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return Problem(result.FirstError.Description);
            }

            return Ok(result.Value);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTrip([FromBody] CreateTripCommand command, CancellationToken ct)
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

            return CreatedAtAction(nameof(GetTrip), new { id = result.Value.Id }, result.Value);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrip(int id, [FromBody] UpdateTripCommand command, CancellationToken ct)
        {
            if (id != command.TripId)
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
        public async Task<IActionResult> DeleteTrip(int id, CancellationToken ct)
        {
            var command = new DeleteTripCommand(id);
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
        /// Update a trip activity's status (Upcoming, InProgress, Completed).
        /// If no status is provided, it auto-determines based on activity start/end times.
        /// </summary>
        [HttpPatch("activities/{activityId}/status")]
        public async Task<IActionResult> UpdateTripActivityStatus(
            int activityId,
            [FromBody] UpdateTripActivityStatusRequest request,
            CancellationToken ct)
        {
            var command = new UpdateTripActivityStatusCommand(activityId, request.Status);
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

        [HttpPost("save")]
        public async Task<IActionResult> SaveTrip([FromBody] SaveTripRequest request, CancellationToken ct)
        {
            var command = new SaveTripCommand(request);
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

            return Ok(new { message = "Trip was saved successfully!!!", tripId = result.Value });
        }

        [HttpPut("{id}/save")]
        public async Task<IActionResult> UpdateSavedTrip(int id, [FromBody] SaveTripRequest request, CancellationToken ct)
        {
            var command = new UpdateSavedTripCommand(id, request);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    ErrorType.Forbidden => Forbid(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(new { message = "Trip was updated successfully!!!", tripId = result.Value });
        }

        /// <summary>
        /// Join a trip using a join code. Returns "Phone_Number_Required" if phone is missing.
        /// </summary>
        [Authorize]
        [HttpPost("join-by-code")]
        public async Task<IActionResult> JoinByCode([FromBody] JoinByCodeRequest request, CancellationToken ct)
        {
            var command = new JoinTripByCodeCommand(request.JoinCode);
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

        /// <summary>
        /// Update join code settings for a trip. Leader only.
        /// Set isActive to enable/disable, regenerate to create a new code.
        /// </summary>
        [Authorize]
        [HttpPut("{tripId}/join-code")]
        public async Task<IActionResult> UpdateJoinCode(int tripId, [FromBody] UpdateJoinCodeRequest request, CancellationToken ct)
        {
            var command = new UpdateJoinCodeCommand(tripId, request.IsActive, request.Regenerate);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => StatusCode(403, result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }
    }

    public record UpdateTripActivityStatusRequest(TripActivityStatus? Status = null);
    public record JoinByCodeRequest(string JoinCode);
    public record UpdateJoinCodeRequest(bool IsActive, bool Regenerate);
}
