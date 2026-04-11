using HSTS.API.Common;
using HSTS.Application.TransitHubQueries.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Route("api/transit-hubs")]
    [ApiController]
    public class TransitHubsController : BaseApiController
    {
        private readonly ISender _mediator;

        public TransitHubsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("by-transportation/{transportationId}")]
        public async Task<IActionResult> GetByTransportation(int transportationId)
        {
            var result = await _mediator.Send(new GetTransitHubsByTransportationQuery(transportationId));
            return result.Match<IActionResult>(Ok, MapErrors);
        }
    }
}
