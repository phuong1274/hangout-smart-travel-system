using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using HSTS.Application.LocationClosures.Commands;
using HSTS.Application.LocationClosures.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class LocationClosuresController : ControllerBase
    {
        private readonly ISender _mediator;

        public LocationClosuresController(ISender mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Get all closures for a specific location
        /// </summary>
        [HttpGet("location/{locationId}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR,PARTNER")]
        public async Task<IActionResult> GetClosuresByLocation(int locationId, CancellationToken ct)
        {
            var result = await _mediator.Send(new GetClosuresByLocationQuery(locationId), ct);

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

        /// <summary>
        /// Create a new closure for a location (PARTNERS can only create for their own locations)
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR,PARTNER")]
        public async Task<IActionResult> Create(CreateLocationClosureRequest request, CancellationToken ct)
        {
            // Get current user info
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized();
            }

            // PARTNERS must validate ownership, ADMIN/CONTENT_MODERATOR can create for any location
            int? userIdForValidation = userRole == "PARTNER" ? userId : null;

            var command = new CreateLocationClosureCommand(
                request.LocationId,
                request.StartDate,
                request.EndDate,
                request.Reason,
                userIdForValidation
            );

            var result = await _mediator.Send(command, ct);

            return result.Match<IActionResult>(
                dto => CreatedAtAction(nameof(GetClosuresByLocation), new { locationId = dto.LocationId }, dto),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    ErrorType.Forbidden => Forbid(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        /// <summary>
        /// Update an existing closure (PARTNERS can only update closures for their own locations)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR,PARTNER")]
        public async Task<IActionResult> Update(int id, UpdateLocationClosureRequest request, CancellationToken ct)
        {
            // Get current user info
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized();
            }

            // PARTNERS must validate ownership, ADMIN/CONTENT_MODERATOR can update any closure
            int? userIdForValidation = userRole == "PARTNER" ? userId : null;

            var command = new UpdateLocationClosureCommand(
                id,
                request.StartDate,
                request.EndDate,
                request.Reason,
                request.IsActive,
                userIdForValidation
            );

            var result = await _mediator.Send(command, ct);

            return result.Match(
                Ok,
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        /// <summary>
        /// End (deactivate) a closure (PARTNERS can only end closures for their own locations)
        /// </summary>
        [HttpPost("{id}/end")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR,PARTNER")]
        public async Task<IActionResult> End(int id, CancellationToken ct)
        {
            // Get current user info
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized();
            }

            // PARTNERS must validate ownership, ADMIN/CONTENT_MODERATOR can end any closure
            int? userIdForValidation = userRole == "PARTNER" ? userId : null;

            var result = await _mediator.Send(new EndLocationClosureCommand(id, userIdForValidation), ct);

            return result.Match<IActionResult>(
                Ok,
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    ErrorType.Forbidden => Forbid(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }

    // Request DTOs
    public record CreateLocationClosureRequest(
        int LocationId,
        DateTime StartDate,
        DateTime EndDate,
        string? Reason
    );

    public record UpdateLocationClosureRequest(
        DateTime StartDate,
        DateTime EndDate,
        string? Reason,
        bool IsActive
    );
}
