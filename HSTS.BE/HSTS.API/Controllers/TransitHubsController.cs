using HSTS.API.Common;
using HSTS.API.Requests;
using HSTS.Application.TransitHubQueries.Queries;
using HSTS.Application.TransitHubManagement.Commands;
using HSTS.Application.TransitHubManagement.Queries;
using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HSTS.API.Controllers
{
    [Route("api/transit-hubs")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class TransitHubsController : BaseApiController
    {
        private readonly ISender _mediator;

        public TransitHubsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetTransitHubs(
            [FromQuery] string? searchTerm,
            [FromQuery] int? districtId,
            [FromQuery] int? transportationId,
            [FromQuery] int? transitHubTypeId,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetTransitHubsPagingQuery(
                searchTerm, districtId, transportationId, transitHubTypeId, pageIndex, pageSize);
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

        [HttpGet("types")]
        public async Task<IActionResult> GetTransitHubTypes(CancellationToken ct = default)
        {
            var result = await _mediator.Send(new GetTransitHubTypeListQuery(), ct);

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

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransitHub(int id, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest("ID must be a positive integer.");

            var result = await _mediator.Send(new GetTransitHubQuery(id), ct);
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

        [HttpGet("by-transportation/{transportationId}")]
        public async Task<IActionResult> GetByTransportation(int transportationId)
        {
            var result = await _mediator.Send(new GetTransitHubsByTransportationQuery(transportationId));
            return result.Match<IActionResult>(Ok, MapErrors);
        }

        [HttpPost]
        [Authorize(Roles = "ADMIN,CONTENT_MODERATOR")]
        public async Task<IActionResult> Create(CreateTransitHubRequest request, CancellationToken ct = default)
        {
            var command = new CreateTransitHubCommand(
                request.Code, request.Name,
                request.Latitude, request.Longitude,
                request.DistrictId, request.TransportationId, request.TransitHubTypeId);
            var result = await _mediator.Send(command, ct);

            return result.Match(
                dto => CreatedAtAction(nameof(GetTransitHub), new { id = dto.Id }, dto),
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
        public async Task<IActionResult> Update(int id, UpdateTransitHubRequest request, CancellationToken ct = default)
        {
            var command = new UpdateTransitHubCommand(
                id, request.Code, request.Name,
                request.Latitude, request.Longitude,
                request.DistrictId, request.TransportationId, request.TransitHubTypeId);
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

            var result = await _mediator.Send(new DeleteTransitHubCommand(id), ct);

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
