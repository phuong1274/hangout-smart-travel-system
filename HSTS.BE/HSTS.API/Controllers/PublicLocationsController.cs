using HSTS.API.Common;
using HSTS.Application.Locations.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers;

[AllowAnonymous]
public class PublicLocationsController : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetLocations([FromQuery] GetPublicLocationsQuery query, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(query, cancellationToken);
        return result.Match(Ok, errors => MapErrors(errors));
    }

    [HttpGet("{locationId:int}")]
    public async Task<IActionResult> GetLocationDetail(int locationId, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetPublicLocationDetailQuery(locationId), cancellationToken);
        return result.Match(Ok, errors => MapErrors(errors));
    }
}
