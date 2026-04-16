using HSTS.API.Common;
using HSTS.Application.Home.Queries;
using HSTS.Application.Locations.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers;

[AllowAnonymous]
public class HomeController : BaseApiController
{
    [HttpGet("discovery")]
    public async Task<IActionResult> GetDiscovery(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetHomeDiscoveryQuery(), cancellationToken);
        return result.Match(Ok, errors => MapErrors(errors));
    }

    [HttpGet("destinations")]
    public async Task<IActionResult> GetDestinations(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetPublicDestinationsQuery(), cancellationToken);
        return result.Match(Ok, errors => MapErrors(errors));
    }
}
