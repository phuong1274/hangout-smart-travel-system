using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.Application.Amenities.Commands;
using HSTS.Application.Amenities.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class AmenitiesController : ControllerBase
    {
        private readonly ISender _mediator;

        public AmenitiesController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAmenities(
            [FromQuery] string? searchTerm,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetAmenitiesPagingQuery(searchTerm, pageIndex, pageSize);
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
        public async Task<IActionResult> GetAmenity(int id)
        {
            var result = await _mediator.Send(new GetAmenityQuery(id));
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
        public async Task<IActionResult> Create(CreateAmenityRequest request)
        {
            var command = new CreateAmenityCommand(request.Name, request.Description);
            var result = await _mediator.Send(command);

            return result.Match(
                amenityDto => CreatedAtAction(nameof(GetAmenity), new { id = amenityDto.Id }, amenityDto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateAmenityRequest request)
        {
            var command = new UpdateAmenityCommand(id, request.Name, request.Description);
            var result = await _mediator.Send(command);

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

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var command = new DeleteAmenityCommand(id);
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

    public record CreateAmenityRequest(string Name, string? Description);
    public record UpdateAmenityRequest(string Name, string? Description);
}
