using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.Locations.Commands;
using HSTS.Application.Locations.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class LocationsController : ControllerBase
    {
        private readonly ISender _mediator;

        public LocationsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetLocations(
            [FromQuery] string? searchTerm,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetLocationsPagingQuery(searchTerm, pageIndex, pageSize);
            var result = await _mediator.Send(query, ct);

            return result.Match(
                response => Ok(response),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetLocation(int id)
        {
            var result = await _mediator.Send(new GetLocationQuery(id));
            return result.Match(
                Ok,
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateLocationRequest request)
        {
            var command = new CreateLocationCommand(
                request.Name,
                request.Description,
                request.Latitude,
                request.Longitude,
                request.TicketPrice,
                request.MinimumAge,
                request.Address,
                request.SocialLink,
                request.LocationTypeId,
                request.DestinationId,
                request.TagIds,
                request.MediaLinks);

            var result = await _mediator.Send(command);

            return result.Match(
                locationDto => CreatedAtAction(nameof(Create), new { id = locationDto.Id }, locationDto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateLocationRequest request)
        {
            var command = new UpdateLocationCommand(
                id,
                request.Name,
                request.Description,
                request.Latitude,
                request.Longitude,
                request.TicketPrice,
                request.MinimumAge,
                request.Address,
                request.SocialLink,
                request.LocationTypeId,
                request.DestinationId,
                request.TagIds,
                request.MediaLinks);

            var result = await _mediator.Send(command);

            return result.Match(
                locationDto => Ok(locationDto),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var command = new DeleteLocationCommand(id);
            var result = await _mediator.Send(command);

            return result.Match(
                _ => Ok("Deleted successfully"),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }
}
