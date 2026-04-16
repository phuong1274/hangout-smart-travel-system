using MediatR;
using Microsoft.AspNetCore.Authorization;
using HSTS.API.Common;
using HSTS.Application.Trips;
using HSTS.Application.Trips.Commands;
using HSTS.Application.Trips.Dtos;
using HSTS.Application.Trips.Queries;
using HSTS.Application.TripActivities.Commands;
using HSTS.Domain.Enums;
using HSTS.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripsController : ControllerBase
    {
        private readonly ISender _mediator;
        private readonly ICurrentUserService _currentUserService;

        public TripsController(ISender mediator, ICurrentUserService currentUserService)
        {
            _mediator = mediator;
            _currentUserService = currentUserService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTrip(int id, CancellationToken ct)
        {
            var currentUserId = _currentUserService.UserId;
            
            if (currentUserId == 0)
            {
                return Unauthorized("User not authenticated.");
            }

            var query = new GetTripByIdQuery(id, currentUserId);
            var result = await _mediator.Send(query, ct);

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

        [HttpGet("{id}/detail")]
        public async Task<IActionResult> GetTripDetail(int id, CancellationToken ct)
        {
            var currentUserId = _currentUserService.UserId;
            
            if (currentUserId == 0)
            {
                return Unauthorized("User not authenticated.");
            }

            var query = new GetTripDetailQuery(id, currentUserId);
            var result = await _mediator.Send(query, ct);

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

        [HttpGet("profile/{profileId}")]
        public async Task<IActionResult> GetTripsByProfile(int profileId, CancellationToken ct)
        {
            var result = await Mediator.Send(new GetTripsByProfileQuery(profileId), ct);
            return result.Match(Ok, MapErrors);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTrip([FromBody] CreateTripCommand command, CancellationToken ct)
        {
            var result = await Mediator.Send(command, ct);
            return result.Match(
                value => CreatedAtAction(nameof(GetTrip), new { id = value.Id }, value),
                MapErrors);
        }

        [HttpPost("save")]
        public async Task<IActionResult> SaveTrip([FromBody] SaveTripRequest request, CancellationToken ct)
        {
            var result = await Mediator.Send(new SaveTripCommand(request), ct);
            return result.Match(
                tripId => Ok(new { message = "Trip was saved successfully!!!", tripId }),
                MapErrors);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTrip(int id, [FromBody] UpdateTripCommand command, CancellationToken ct)
        {
            if (id != command.TripId)
            {
                return BadRequest("ID mismatch.");
            }

            var result = await Mediator.Send(command, ct);
            return result.Match(Ok, MapErrors);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTrip(int id, CancellationToken ct)
        {
            var result = await Mediator.Send(new DeleteTripCommand(id), ct);
            return result.Match(_ => NoContent(), MapErrors);
        }

        [HttpPatch("activities/{activityId}/status")]
        public async Task<IActionResult> UpdateTripActivityStatus(
            int activityId,
            [FromBody] UpdateTripActivityStatusRequest request,
            CancellationToken ct)
        {
            var command = new UpdateTripActivityStatusCommand(activityId, request.Status);
            var result = await Mediator.Send(command, ct);
            return result.Match(Ok, MapErrors);
        }

        /// <summary>
        /// Batch update: complete all previous activities and start a new one atomically.
        /// </summary>
        [HttpPost("activities/batch-status")]
        public async Task<IActionResult> BatchUpdateActivityStatus(
            [FromBody] BatchUpdateActivityStatusRequest request,
            CancellationToken ct)
        {
            var command = new BatchUpdateActivityStatusCommand(
                request.ActivityIdsToComplete,
                request.ActivityIdToStart
            );
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

    }

    public record UpdateTripActivityStatusRequest(TripActivityStatus? Status = null);
    public record BatchUpdateActivityStatusRequest(List<int> ActivityIdsToComplete, int ActivityIdToStart);
}
