using HSTS.API.Common;
using HSTS.Application.Itineraries.Commands;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Authorize]
    public class ItinerariesController : BaseApiController
    {
        [HttpPost("smart")]
        public async Task<IActionResult> GenerateSmartItinerary([FromBody] GenerateSmartItineraryCommand command)
        {
            var result = await Mediator.Send(command);
            return result.Match<IActionResult>(Ok, MapErrors);
        }
    }
}