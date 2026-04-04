using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.Application.Tags.Queries;
using HSTS.Application.Districts.Queries;
using HSTS.Application.Amenities.Queries;
using HSTS.Application.Provinces.Queries;
using HSTS.Application.Locations.Queries;
using HSTS.Application.Interfaces;
using static HSTS.Application.Interfaces.IRepository;
using Microsoft.EntityFrameworkCore;

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

        [HttpGet("districts")]
        public async Task<IActionResult> GetAllDistricts()
        {
            var result = await _mediator.Send(new GetAllDistrictsQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("location-types")]
        public async Task<IActionResult> GetAllLocationTypes([FromServices] IRepository<Domain.Entities.LocationType> locationTypeRepo)
        {
            var locationTypes = await locationTypeRepo.Query()
                .Where(lt => !lt.IsDeleted)
                .Select(lt => new {
                    lt.Id,
                    lt.Name,
                    lt.Description
                })
                .ToListAsync();
            return Ok(locationTypes);
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

        [HttpGet("provinces")]
        public async Task<IActionResult> GetAllProvinces()
        {
            var result = await _mediator.Send(new GetAllProvincesQuery());
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("countries/{countryId}/provinces")]
        public async Task<IActionResult> GetProvincesByCountry(string countryId)
        {
            var result = await _mediator.Send(new GetProvincesByCountryQuery(countryId));
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }

        [HttpGet("provinces/{provinceId}/districts")]
        public async Task<IActionResult> GetDistrictsByProvince(int provinceId)
        {
            var result = await _mediator.Send(new GetDistrictsByProvinceQuery(provinceId));
            return result.Match<IActionResult>(
                Ok,
                errors => NotFound(errors.First().Description)
            );
        }
    }
}
