using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
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

        /// <summary>
        /// Get all location types (non-paged)
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllLocationTypes(CancellationToken ct)
        {
            var result = await _mediator.Send(new GetAllLocationTypesQuery());

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

        /// <summary>
        /// Get location types with paging and filtering
        /// </summary>
        [HttpGet("paged")]
        public async Task<IActionResult> GetLocationTypes(
            [FromQuery] string? searchTerm,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetLocationTypesPagingQuery(searchTerm, fromDate, toDate, pageIndex, pageSize);
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

        /// <summary>
        /// Get a location type by ID
        /// </summary>
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

        /// <summary>
        /// Create a new location type
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Create(CreateLocationTypeRequest request)
        {
            var command = new CreateLocationTypeCommand(request.Name, request.Description);
            var result = await _mediator.Send(command);

            return result.Match(
                locationTypeDto => CreatedAtAction(nameof(GetLocationType), new { id = locationTypeDto.Id }, locationTypeDto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        /// <summary>
        /// Update an existing location type
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Update(int id, UpdateLocationTypeRequest request)
        {
            var command = new UpdateLocationTypeCommand(id, request.Name, request.Description);
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

        /// <summary>
        /// Delete a location type (soft delete)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Delete(int id)
        {
            var command = new DeleteLocationTypeCommand(id);
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
