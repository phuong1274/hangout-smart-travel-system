using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.LocationTypes.Commands;
using HSTS.Application.LocationTypes.Queries;

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

        [HttpGet]
        public async Task<IActionResult> GetLocationTypes(
            [FromQuery] string? searchTerm,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetLocationTypesPagingQuery(searchTerm, pageIndex, pageSize);
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
        public async Task<IActionResult> GetLocationType(int id)
        {
            var result = await _mediator.Send(new GetLocationTypeQuery(id));
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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var command = new DeleteLocationTypeCommand(id);
            var result = await _mediator.Send(command);

            return result.Match(
                locationTypeDto => Ok("Deleted successfully"),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }
}
