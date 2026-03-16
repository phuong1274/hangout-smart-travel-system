using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
