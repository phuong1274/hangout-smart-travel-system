using HSTS.API.Common;
using HSTS.Application.Reviews.Commands;
using HSTS.Application.Reviews.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HSTS.API.Controllers
{
    [Authorize(Roles = "ADMIN")]
    [EnableRateLimiting("fixed")]
    [Route("api/admin")]
    public class AdminReviewModerationController : BaseApiController
    {
        [HttpGet("review-reports")]
        public async Task<IActionResult> GetReportedReviews([FromQuery] int pageIndex = 1, [FromQuery] int pageSize = 10)
        {
            var result = await Mediator.Send(new GetReportedReviewsQuery(pageIndex, pageSize));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpGet("review-reports/{reviewId:int}")]
        public async Task<IActionResult> GetReportedReviewDetail(int reviewId)
        {
            var result = await Mediator.Send(new GetReportedReviewDetailQuery(reviewId));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPost("reviews/{reviewId:int}/ignore-reports")]
        public async Task<IActionResult> IgnoreReports(int reviewId, [FromBody] IgnoreReviewReportsBody body)
        {
            var result = await Mediator.Send(new IgnoreReviewReportsCommand(reviewId, body?.ResolutionNote));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        [HttpPost("reviews/{reviewId:int}/hide")]
        public async Task<IActionResult> Hide(int reviewId)
        {
            var result = await Mediator.Send(new HideReviewCommand(reviewId));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        [HttpDelete("reviews/{reviewId:int}")]
        public async Task<IActionResult> Delete(int reviewId, [FromQuery] string? note)
        {
            var result = await Mediator.Send(new DeleteModeratedReviewCommand(reviewId, note));
            return result.Match<IActionResult>(_ => NoContent(), MapErrors);
        }

        public record IgnoreReviewReportsBody(string? ResolutionNote);
    }
}
