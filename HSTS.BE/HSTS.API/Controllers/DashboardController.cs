using HSTS.API.Common;
using HSTS.Application.Dashboard.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers;

[Authorize(Roles = "ADMIN")]
public class DashboardController : BaseApiController
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetAdminDashboardSummaryQuery(), cancellationToken);
        return result.Match(Ok, errors => MapErrors(errors));
    }

    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends([FromQuery] int months = 6, CancellationToken cancellationToken = default)
    {
        var result = await Mediator.Send(new GetAdminDashboardTrendsQuery(months), cancellationToken);
        return result.Match(Ok, errors => MapErrors(errors));
    }
}
