using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.LocationMedias.Commands;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class LocationMediasController : ControllerBase
    {
        private readonly ISender _mediator;

        public LocationMediasController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateLocationMediaRequest request)
        {
            var command = new CreateLocationMediaCommand(request.Links, request.LocationId);
            var result = await _mediator.Send(command);

            return result.Match(
                mediaDtos => Ok(mediaDtos),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut]
        public async Task<IActionResult> Update(UpdateLocationMediaRequest request)
        {
            var command = new UpdateLocationMediaCommand(request.Links, request.LocationId);
            var result = await _mediator.Send(command);

            return result.Match(
                mediaDtos => Ok(mediaDtos),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }
}
