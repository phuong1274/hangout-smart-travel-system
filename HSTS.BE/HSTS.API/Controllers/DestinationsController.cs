using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.Destinations.Commands;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class DestinationsController : ControllerBase
    {
        private readonly ISender _mediator;

        public DestinationsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateDestinationRequest request)
        {
            var command = new CreateDestinationCommand(request.Name);
            var result = await _mediator.Send(command);

            return result.Match(
                dto => CreatedAtAction(nameof(Create), new { id = dto.Id }, dto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateDestinationRequest request)
        {
            var command = new UpdateDestinationCommand(id, request.Name);
            var result = await _mediator.Send(command);

            return result.Match(
                dto => Ok(dto),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }
}
