using HSTS.API.Common;
using HSTS.Application.Trips;
using HSTS.Application.Trips.Commands;
using HSTS.Application.Trips.Dtos;
using HSTS.Application.Trips.Queries;
using HSTS.Application.TripActivities.Commands;
using HSTS.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    public class TripsController : BaseApiController
    {
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTrip(int id, CancellationToken ct)
        {
            var result = await Mediator.Send(new GetTripByIdQuery(id), ct);
            return result.Match(Ok, MapErrors);
        }

        [HttpGet("{id}/detail")]
        public async Task<IActionResult> GetTripDetail(int id, CancellationToken ct)
        {
            var result = await Mediator.Send(new GetTripDetailQuery(id), ct);
            return result.Match(Ok, MapErrors);
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
    }

    public record UpdateTripActivityStatusRequest(TripActivityStatus? Status = null);
}
