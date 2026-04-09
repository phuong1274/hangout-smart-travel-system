using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HSTS.Application.Expenses;
using HSTS.Application.Expenses.Commands;
using HSTS.Application.Expenses.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpensesController : ControllerBase
    {
        private readonly ISender _mediator;

        public ExpensesController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetExpense(int id, CancellationToken ct)
        {
            var query = new GetExpenseByIdQuery(id);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => Forbid(),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetExpensesByTrip(int tripId, CancellationToken ct)
        {
            var query = new GetExpensesByTripQuery(tripId);
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

        [HttpGet("trip/{tripId}/total")]
        public async Task<IActionResult> GetTotalExpenseByTrip(int tripId, CancellationToken ct)
        {
            var query = new GetTotalExpenseByTripQuery(tripId);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return Problem(result.FirstError.Description);
            }

            return Ok(result.Value);
        }

        [HttpGet("trip/{tripId}/by-timeline")]
        public async Task<IActionResult> AggregateExpensesByTimeline(int tripId, CancellationToken ct)
        {
            var query = new AggregateExpensesByTimelineQuery(tripId);
            var result = await _mediator.Send(query, ct);

            if (result.IsError)
            {
                return Problem(result.FirstError.Description);
            }

            return Ok(result.Value);
        }

        [HttpPost]
        public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseCommand command, CancellationToken ct)
        {
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => Forbid(),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return CreatedAtAction(nameof(GetExpense), new { id = result.Value.Id }, result.Value);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateExpense(int id, [FromBody] UpdateExpenseCommand command, CancellationToken ct)
        {
            if (id != command.ExpenseId)
            {
                return BadRequest("ID mismatch.");
            }

            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => Forbid(),
                    ErrorType.Validation => BadRequest(result.FirstError.Description),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return Ok(result.Value);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteExpense(int id, CancellationToken ct)
        {
            var command = new DeleteExpenseCommand(id);
            var result = await _mediator.Send(command, ct);

            if (result.IsError)
            {
                return result.FirstError.Type switch
                {
                    ErrorType.NotFound => NotFound(result.FirstError.Description),
                    ErrorType.Forbidden => Forbid(),
                    _ => Problem(result.FirstError.Description)
                };
            }

            return NoContent();
        }
    }
}
