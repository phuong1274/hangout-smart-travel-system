using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using HSTS.API.Requests;
using HSTS.Application.LocationSubmissions;
using HSTS.Application.LocationSubmissions.Commands;
using HSTS.Application.LocationSubmissions.Queries;
using HSTS.Domain.Entities;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class LocationSubmissionsController : ControllerBase
    {
        private readonly ISender _mediator;

        public LocationSubmissionsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("my")]
        [Authorize]
        public async Task<IActionResult> GetMySubmissions(
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized();
            }

            var query = new GetMySubmissionsQuery(userId, pageIndex, pageSize);
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
        [Authorize]
        public async Task<IActionResult> GetSubmission(int id, CancellationToken ct)
        {
            var result = await _mediator.Send(new GetSubmissionByIdQuery(id), ct);

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

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create(CreateLocationSubmissionRequest request, CancellationToken ct)
        {
            var socialLinks = request.SocialLinks?.Select(s => new LocationSubmissionSocialLinkDto(s.Platform, s.Url)).ToList();

            // Convert OpeningHours from request to DTO format
            var openingHours = request.OpeningHours?.Select(oh => new LocationSubmissionOpeningHourDto(
                oh.Id,
                oh.DayOfWeek,
                ((DayOfWeek)oh.DayOfWeek).ToString(),
                !string.IsNullOrEmpty(oh.OpenTime) ? TimeSpan.Parse(oh.OpenTime) : null,
                !string.IsNullOrEmpty(oh.CloseTime) ? TimeSpan.Parse(oh.CloseTime) : null,
                oh.Note
            )).ToList();

            // Convert Seasons from request to DTO format
            var seasons = request.Seasons?.Select(s => new LocationSubmissionSeasonDto(
                s.Id,
                s.Description,
                s.Months
            )).ToList();

            var command = new CreateLocationSubmissionCommand(
                request.Name,
                request.Description,
                request.Latitude,
                request.Longitude,
                request.Address,
                request.Telephone,
                request.Email,
                request.PriceMinUsd,
                request.PriceMaxUsd,
                request.Score,
                request.DestinationId,
                request.LocationTypeId,
                request.MediaLinks,
                socialLinks,
                request.AmenityIds,
                request.TagIds,
                openingHours,
                seasons,
                request.SubmissionType,
                request.ExistingLocationId,
                request.ProposedChanges
            );

            var result = await _mediator.Send(command, ct);

            return result.Match(
                dto => CreatedAtAction(nameof(GetSubmission), new { id = dto.Id }, dto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, CreateLocationSubmissionRequest request, CancellationToken ct)
        {
            var socialLinks = request.SocialLinks?.Select(s => new LocationSubmissionSocialLinkDto(s.Platform, s.Url)).ToList();

            var command = new UpdateLocationSubmissionCommand(
                id,
                request.Name,
                request.Description,
                request.Latitude,
                request.Longitude,
                request.Address,
                request.Telephone,
                request.Email,
                request.PriceMinUsd,
                request.PriceMaxUsd,
                request.Score,
                request.DestinationId,
                request.LocationTypeId,
                request.MediaLinks,
                socialLinks,
                request.AmenityIds,
                request.TagIds
            );

            var result = await _mediator.Send(command, ct);

            return result.Match<IActionResult>(
                Ok,
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

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized();
            }

            var command = new DeleteLocationSubmissionCommand(id, userId);
            var result = await _mediator.Send(command, ct);

            return result.Match<IActionResult>(
                _ => Ok(new { message = "Submission deleted successfully" }),
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

        [HttpPost("{id}/review")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Review(int id, ReviewLocationSubmissionRequest request, CancellationToken ct)
        {
            var reviewedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "admin";

            var command = new ReviewLocationSubmissionCommand(
                id,
                request.Status,
                request.RejectionReason,
                reviewedBy
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

        [HttpGet("admin/all")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> GetAllSubmissions(
            [FromQuery] string? searchTerm,
            [FromQuery] SubmissionStatus? status,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetAllSubmissionsPagingQuery(searchTerm, status, pageIndex, pageSize);
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
    }
}
