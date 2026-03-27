using HSTS.API.Common;
using HSTS.Application.Itineraries.Commands;
using HSTS.Application.Itineraries.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace HSTS.API.Controllers;

[Route("api/itineraries")]
public class SmartItineraryController : BaseApiController
{
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] CalculateSmartItineraryCommand command)
    {
        var result = await Mediator.Send(command);

        return result.Match(
            itinerary => Ok(itinerary),
            errors => MapErrors(errors));
    }

    [Authorize]
    [HttpPost("save")]
    public async Task<IActionResult> Save([FromBody] SaveItineraryCommand command)
    {
        var result = await Mediator.Send(command);

        return result.Match(
            id => CreatedAtAction(nameof(Save), new { id }, id),
            errors => MapErrors(errors));
    }
}
