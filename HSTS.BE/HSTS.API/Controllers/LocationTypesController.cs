using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.LocationTypes.Commands;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class LocationTypesController : ControllerBase
    {
        private readonly ISender _mediator;

        public LocationTypesController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateLocationTypeRequest request)
        {
            var command = new CreateLocationTypeCommand(request.Name);
            var result = await _mediator.Send(command);

            return result.Match(
                locationTypeDto => CreatedAtAction(nameof(Create), new { id = locationTypeDto.Id }, locationTypeDto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateLocationTypeRequest request)
        {
            var command = new UpdateLocationTypeCommand(id, request.Name);
            var result = await _mediator.Send(command);

            return result.Match(
                locationTypeDto => Ok(locationTypeDto),
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
