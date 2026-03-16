using ErrorOr;
using MediatR;
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
        public async Task<IActionResult> GetMySubmissions(
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
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
        public async Task<IActionResult> Create(CreateLocationSubmissionRequest request, CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var socialLinks = request.SocialLinks?.Select(s => new LocationSubmissionSocialLinkDto(s.Platform, s.Url)).ToList();

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
                request.DestinationId,
                request.LocationTypeId,
                request.MediaLinks,
                socialLinks,
                request.AmenityIds,
                request.TagIds,
                userId
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
        public async Task<IActionResult> Update(int id, CreateLocationSubmissionRequest request, CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

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
                request.DestinationId,
                request.LocationTypeId,
                request.MediaLinks,
                socialLinks,
                request.AmenityIds,
                request.TagIds,
                userId
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
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
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
