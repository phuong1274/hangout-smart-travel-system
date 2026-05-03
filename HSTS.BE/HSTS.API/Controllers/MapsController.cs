using HSTS.Application.Maps;
using HSTS.API.Common;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MapsController : BaseApiController
    {
        [HttpPost("resolve-link")]
        public async Task<IActionResult> ResolveLink([FromBody] ResolveMapLinkRequest request)
        {
            var result = await Mediator.Send(new ResolveMapLinkQuery(request.Url));
            return result.Match(
                Ok,
                errors => MapErrors(errors));
        }
    }

    public record ResolveMapLinkRequest(string Url);
}
