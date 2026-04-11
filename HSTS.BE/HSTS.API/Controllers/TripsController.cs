using Microsoft.AspNetCore.Mvc;
using HSTS.API.Common;
using HSTS.Application.Trips.Commands;
using HSTS.Application.Trips.Dtos;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    public class TripsController : BaseApiController
    {
        [HttpPost("save")]
        public async Task<IActionResult> SaveTrip(SaveTripRequest request)
        {
            var command = new SaveTripCommand(request);
            var result = await Mediator.Send(command);

            return result.Match(
                tripId => Ok(new { message = "Trip was saved successfully!!!", tripId = tripId }),
                MapErrors
            );
        }
    }
}
