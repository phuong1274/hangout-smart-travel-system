using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.LocalTransportMetricsFeature.Commands;
using HSTS.Application.LocalTransportMetricsFeature.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/local-transport-metrics")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class LocalTransportMetricsController : ControllerBase
    {
        private readonly ISender _mediator;

        public LocalTransportMetricsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetLocalTransportMetrics(
            [FromQuery] int? transportationId,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetLocalTransportMetricsPagingQuery(transportationId, pageIndex, pageSize);
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

        [HttpGet("{transportationId}")]
        public async Task<IActionResult> GetLocalTransportMetric(int transportationId, CancellationToken ct = default)
        {
            if (transportationId <= 0) return BadRequest("TransportationId must be a positive integer.");

            var result = await _mediator.Send(new GetLocalTransportMetricsQuery(transportationId), ct);
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
        public async Task<IActionResult> Create(CreateLocalTransportMetricsRequest request, CancellationToken ct = default)
        {
            var command = new CreateLocalTransportMetricsCommand(
                request.TransportationId, request.CostPerKm,
                request.SpeedKmh, request.MaxRecommendedDistance);
            var result = await _mediator.Send(command, ct);

            return result.Match(
                dto => CreatedAtAction(nameof(GetLocalTransportMetric),
                    new { transportationId = dto.TransportationId }, dto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{transportationId}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Update(
            int transportationId, UpdateLocalTransportMetricsRequest request, CancellationToken ct = default)
        {
            if (transportationId <= 0) return BadRequest("TransportationId must be a positive integer.");

            var command = new UpdateLocalTransportMetricsCommand(
                transportationId, request.CostPerKm,
                request.SpeedKmh, request.MaxRecommendedDistance);
            var result = await _mediator.Send(command, ct);

            return result.Match(
                dto => Ok(dto),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    ErrorType.Validation => BadRequest(errors),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpDelete("{transportationId}")]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Delete(int transportationId, CancellationToken ct = default)
        {
            if (transportationId <= 0) return BadRequest("TransportationId must be a positive integer.");

            var result = await _mediator.Send(new DeleteLocalTransportMetricsCommand(transportationId), ct);

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
