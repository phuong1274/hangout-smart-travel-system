using MediatR;
using Microsoft.AspNetCore.Mvc;
using HSTS.Application.Expenses;
using HSTS.Application.Expenses.Commands;
using HSTS.Application.Expenses.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripMembersController : ControllerBase
    {
        private readonly ISender _mediator;

        public TripMembersController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTripMember(int id, CancellationToken ct)
        {
            var query = new GetTripMemberByIdQuery(id);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetTripMembersByTrip(int tripId, CancellationToken ct)
        {
            var query = new GetTripMembersByTripQuery(tripId);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return Problem(result.FirstError.Description);
            }

            return Ok(result.Value);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTripMember([FromBody] CreateTripMemberCommand command, CancellationToken ct)
        {
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return CreatedAtAction(nameof(GetTripMember), new { id = result.Value.Id }, result.Value);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTripMember(int id, [FromBody] UpdateTripMemberCommand command, CancellationToken ct)
        {
            if (id != command.MemberId)
            {
                return BadRequest("ID mismatch.");
            }

            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTripMember(int id, CancellationToken ct)
        {
            var command = new DeleteTripMemberCommand(id);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return NoContent();
        }
    }
}
