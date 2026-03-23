using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.Application.Tags.Queries;
using HSTS.Application.Destinations.Queries;
using HSTS.Application.LocationTypes.Queries;
using HSTS.Application.Amenities.Queries;
using HSTS.Application.States.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/common")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class CommonController : ControllerBase
    {
        private readonly ISender _mediator;

        public CommonController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("tags")]
        public async Task<IActionResult> GetAllTags()
        {
            var result = await _mediator.Send(new GetAllTagsQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("destinations")]
        public async Task<IActionResult> GetAllDestinations()
        {
            var result = await _mediator.Send(new GetAllDestinationsQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("location-types")]
        public async Task<IActionResult> GetAllLocationTypes()
        {
            var result = await _mediator.Send(new GetAllLocationTypesQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("amenities")]
        public async Task<IActionResult> GetAllAmenities()
        {
            var result = await _mediator.Send(new GetAllAmenitiesQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("states")]
        public async Task<IActionResult> GetAllStates()
        {
            var result = await _mediator.Send(new GetAllStatesQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("countries/{countryId}/states")]
        public async Task<IActionResult> GetStatesByCountry(string countryId)
        {
            var result = await _mediator.Send(new GetStatesByCountryQuery(countryId));
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }
    }
}
