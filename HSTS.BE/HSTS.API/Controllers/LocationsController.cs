using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.Locations.Commands;
using HSTS.Application.Locations.Queries;
using HSTS.Application.Countries.Queries;
using HSTS.Application.States.Queries;
using HSTS.Application.Countries;
using HSTS.Application.States;

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

        [HttpGet("admin/all")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> GetAllLocations(
            [FromQuery] string? searchTerm,
            [FromQuery] bool includeDeleted = false,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetAllLocationsPagingQuery(searchTerm, includeDeleted, pageIndex, pageSize);
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
        public async Task<IActionResult> GetLocation(int id, CancellationToken ct)
        {
            var result = await _mediator.Send(new GetLocationQuery(id), ct);

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
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Create(CreateLocationRequest request, CancellationToken ct)
        {
            var command = new CreateLocationCommand(
                request.Name,
                request.Description,
                request.Latitude,
                request.Longitude,
                request.TicketPrice,
                request.MinimumAge,
                request.Address,
                request.LocationTypeId,
                request.DestinationId,
                request.Telephone,
                request.Email,
                request.PriceMinUsd,
                request.PriceMaxUsd,
                request.RecommendedDurationMinutes,
                request.Score,
                request.TagIds,
                request.MediaLinks,
                request.SocialLinks,
                request.AmenityIds,
                request.OpeningHours,
                request.Seasons
            );

            var result = await _mediator.Send(command, ct);

            return result.Match(
                locationDto => CreatedAtAction(nameof(GetLocation), new { id = locationDto.Id }, locationDto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Update(int id, UpdateLocationRequest request, CancellationToken ct)
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
                request.LocationTypeId,
                request.DestinationId,
                request.Telephone,
                request.Email,
                request.PriceMinUsd,
                request.PriceMaxUsd,
                request.RecommendedDurationMinutes,
                request.Score,
                request.TagIds,
                request.MediaLinks,
                request.SocialLinks,
                request.AmenityIds,
                request.OpeningHours,
                request.Seasons
            );

            var result = await _mediator.Send(command, ct);

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
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var command = new DeleteLocationCommand(id);
            var result = await _mediator.Send(command, ct);

            return result.Match(
                _ => Ok(new { message = "Location deleted successfully" }),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpGet("countries")]
        public async Task<IActionResult> GetCountries(CancellationToken ct)
        {
            var result = await _mediator.Send(new GetAllCountriesQuery(), ct);

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

        [HttpGet("states")]
        public async Task<IActionResult> GetStates([FromQuery] string? countryId, CancellationToken ct)
        {
            ErrorOr<IEnumerable<StateDto>> result;

            if (!string.IsNullOrEmpty(countryId))
            {
                result = await _mediator.Send(new GetStatesByCountryQuery(countryId), ct);
            }
            else
            {
                result = await _mediator.Send(new GetAllStatesQuery(), ct);
            }

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
    }
}
