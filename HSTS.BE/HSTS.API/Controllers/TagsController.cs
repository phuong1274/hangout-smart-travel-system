using ErrorOr;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.Tags.Commands;
using HSTS.Application.Tags.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class TagsController : ControllerBase
    {
        private readonly ISender _mediator;

        public TagsController(ISender mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetTags(
            [FromQuery] string? searchTerm,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetTagsPagingQuery(searchTerm, pageIndex, pageSize);
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
        public async Task<IActionResult> GetTag(int id)
        {
            var result = await _mediator.Send(new GetTagQuery(id));
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
        public async Task<IActionResult> Create(CreateTagRequest request)
        {
            var command = new CreateTagCommand(request.Name);
            var result = await _mediator.Send(command);

            return result.Match(
                tagDto => CreatedAtAction(nameof(Create), new { id = tagDto.Id }, tagDto),
                errors => errors.First().Type switch
                {
                    ErrorType.Validation => BadRequest(errors),
                    ErrorType.Conflict => Conflict(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateTagRequest request)
        {
            var command = new UpdateTagCommand(id, request.Name);
            var result = await _mediator.Send(command);

            return result.Match(
                tagDto => Ok(tagDto),
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
        public async Task<IActionResult> Delete(int id)
        {
            var command = new DeleteTagCommand(id);
            var result = await _mediator.Send(command);

            return result.Match(
                tagDto => Ok("Deleted successfully"),
                errors => errors.First().Type switch
                {
                    ErrorType.NotFound => NotFound(errors.First().Description),
                    _ => Problem(errors.First().Description)
                }
            );
        }
    }
}
