using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.Locations.Commands;

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
                request.LocationTypeId);

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
                request.LocationTypeId);

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
    }
}
