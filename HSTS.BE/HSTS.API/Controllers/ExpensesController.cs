using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HSTS.Application.Expenses;
using HSTS.Application.Expenses.Commands;
using HSTS.Application.Expenses.Queries;
using HSTS.Application.Interfaces;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ExpensesController : ControllerBase
    {
        private readonly ISender _mediator;
        private readonly ICurrentUserService _currentUserService;

        public ExpensesController(ISender mediator, ICurrentUserService currentUserService)
        {
            _mediator = mediator;
            _currentUserService = currentUserService;
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

        [HttpGet("trip/{tripId}/budget-vs-actual")]
        public async Task<IActionResult> GetTripBudgetVsActual(int tripId, CancellationToken ct)
        {
            var query = new GetTripBudgetVsActualQuery(tripId);
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

        /// <summary>
        /// Get budget vs actual data formatted for PDF export with individual expense logs per activity.
        /// </summary>
        [HttpGet("trip/{tripId}/budget-vs-actual/export")]
        public async Task<IActionResult> GetTripBudgetVsActualExport(int tripId, CancellationToken ct)
        {
            var query = new GetTripBudgetVsActualExportQuery(tripId);
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

        /// <summary>
        /// Get expenses grouped by activity for a trip. Returns each activity's individual expense logs + total.
        /// </summary>
        [HttpGet("trip/{tripId}/by-activity")]
        public async Task<IActionResult> GetExpensesGroupedByActivity(int tripId, CancellationToken ct)
        {
            var query = new GetExpensesGroupedByActivityQuery(tripId);
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

        [HttpPost]
        public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseRequest request, CancellationToken ct)
        {
            var currentUserId = _currentUserService.UserId;

            if (currentUserId == 0)
            {
                return Unauthorized("User not authenticated.");
            }

            var command = new CreateExpenseCommand(
                request.TripActivityId,
                request.Title,
                request.Description,
                request.TotalAmount,
                currentUserId.ToString()
            );
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
        public async Task<IActionResult> UpdateExpense(int id, [FromBody] UpdateExpenseRequest request, CancellationToken ct)
        {
            var currentUserId = _currentUserService.UserId;

            if (currentUserId == 0)
            {
                return Unauthorized("User not authenticated.");
            }

            var command = new UpdateExpenseCommand(
                id,
                request.Title,
                request.Description,
                request.TotalAmount,
                currentUserId.ToString()
            );
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
            var currentUserId = _currentUserService.UserId;
            
            if (currentUserId == 0)
            {
                return Unauthorized("User not authenticated.");
            }

            var command = new DeleteExpenseCommand(id, currentUserId);
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

    public record CreateExpenseRequest(
        int TripActivityId,
        string Title,
        string? Description,
        decimal TotalAmount
    );

    public record UpdateExpenseRequest(
        string Title,
        string? Description,
        decimal TotalAmount
    );
}
