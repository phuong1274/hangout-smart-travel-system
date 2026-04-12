using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.TransportModes.Commands;
using HSTS.Application.TransportModes.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/transport-modes")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class TransportModesController : ControllerBase
    {
        private readonly ISender _mediator;

        public TransportModesController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetTransportModes(
            [FromQuery] string? searchTerm,
            [FromQuery] int? category,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetTransportModesPagingQuery(searchTerm, category, pageIndex, pageSize);
            var result = await _mediator.Send(query, ct);

            return result.Match(
                response => Ok(response),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransportMode(int id, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest("ID must be a positive integer.");

            var result = await _mediator.Send(new GetTransportModeQuery(id), ct);
            return result.Match(
                Ok,
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPost]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Create(CreateTransportModeRequest request, CancellationToken ct = default)
        {
            var command = new CreateTransportModeCommand(request.Name, request.Category, request.Capacity);
            var result = await _mediator.Send(command, ct);

            return result.Match(
                dto => CreatedAtAction(nameof(GetTransportMode), new { id = dto.Id }, dto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Update(int id, UpdateTransportModeRequest request, CancellationToken ct = default)
        {
            var command = new UpdateTransportModeCommand(id, request.Name, request.Category, request.Capacity);
            var result = await _mediator.Send(command, ct);

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

        [HttpDelete("{id}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest("ID must be a positive integer.");

            var result = await _mediator.Send(new DeleteTransportModeCommand(id), ct);

            return result.Match(
                _ => Ok("Deleted successfully"),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }
}
