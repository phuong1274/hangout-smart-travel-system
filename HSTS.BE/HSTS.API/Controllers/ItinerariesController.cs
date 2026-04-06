using HSTS.API.Common;
using HSTS.Application.Itineraries.Queries;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    public class ItinerariesController : BaseApiController
    {
        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromBody] GenerateItineraryQuery query)
        {
            var result = await Mediator.Send(query);
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("sandbox-transport-options")]
        public async Task<IActionResult> SearchSandbox([FromQuery] SearchSandboxTransportQuery query)
        {
            var result = await Mediator.Send(query);
            return result.Match<IActionResult>(Ok, MapErrors);
        }
    }
}
