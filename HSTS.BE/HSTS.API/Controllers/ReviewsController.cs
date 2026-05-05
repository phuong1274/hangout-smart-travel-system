using HSTS.API.Common;
using HSTS.Application.Reviews.Commands;
using HSTS.Application.Reviews.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HSTS.API.Controllers
{
    [EnableRateLimiting("fixed")]
    public class ReviewsController : BaseApiController
    {
        [HttpGet("/api/locations/{locationId:int}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetByLocation(int locationId, [FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10)
        {
            var result = await Mediator.Send(new GetLocationReviewsQuery(locationId, pageIndex, pageSize));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("/api/locations/{locationId:int}/reviews/eligibility")]
        [Authorize(Roles = "TRAVELER")]
        public async Task<IActionResult> GetEligibility(int locationId)
        {
            var result = await Mediator.Send(new GetReviewEligibilityQuery(locationId));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("/api/locations/{locationId:int}/reviews/me")]
        [Authorize]
        public async Task<IActionResult> GetMyReview(int locationId)
        {
            var result = await Mediator.Send(new GetMyLocationReviewQuery(locationId));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("/api/reviews/me")]
        [Authorize(Roles = "TRAVELER")]
        public async Task<IActionResult> GetMine([FromQuery] GetMyReviewsQuery query)
        {
            var result = await Mediator.Send(query);
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPost("/api/reviews")]
        [Authorize(Roles = "TRAVELER")]
        public async Task<IActionResult> Create([FromBody] CreateReviewCommand command)
        {
            var result = await Mediator.Send(command);
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPut("/api/reviews/{reviewId:int}")]
        [Authorize(Roles = "TRAVELER")]
        public async Task<IActionResult> Update(int reviewId, [FromBody] UpdateReviewCommand body)
        {
            if (reviewId != body.ReviewId)
                return BadRequest(new { message = "Review ID in route does not match request body." });

            var result = await Mediator.Send(body);
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpDelete("/api/reviews/{reviewId:int}")]
        [Authorize(Roles = "TRAVELER")]
        public async Task<IActionResult> Delete(int reviewId)
        {
            var result = await Mediator.Send(new DeleteReviewCommand(reviewId));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        [HttpPost("/api/reviews/{reviewId:int}/reports")]
        [Authorize]
        public async Task<IActionResult> Report(int reviewId, [FromBody] CreateReviewReportCommand? body)
        {
            if (body is null)
                return BadRequest(new { message = "Request body is required." });

            if (reviewId != body.ReviewId)
                return BadRequest(new { message = "Review ID in route does not match request body." });

            var result = await Mediator.Send(body);
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }
    }
}
