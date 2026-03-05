using ErrorOr;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using HSTS.API.Requests;
using HSTS.Application.Users.Commands;
using HSTS.Application.Users.Queries;

namespace HSTS.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("fixed")]
    public class UsersController : ControllerBase
    {
        private readonly ISender _mediator;
        public UsersController(ISender mediator) => _mediator = mediator;

        // GET: api/users/paging
        [HttpGet("paging")]
        public async Task<IActionResult> GetUsersPaging(
            [FromQuery] string? searchTerm,
            [FromQuery] int pageIndex = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken ct = default)
        {
            var query = new GetUsersPagingQuery(searchTerm, pageIndex, pageSize);
            var result = await _mediator.Send(query, ct);

            return result.Match(
                Ok,
                errors => Problem(errors.First().Description)
            );
        }

        // GET: api/users/all
        [HttpGet("all")]
        public async Task<IActionResult> GetUsers()
        {
            var result = await _mediator.Send(new GetUsersQuery());

            return result.Match(
                Ok,
                errors => Problem(errors.First().Description)
            );
        }

        // GET: api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var result = await _mediator.Send(new GetUserQuery(id));

            return result.Match(
                Ok,
                errors => Problem(errors.First().Description)
            );
        }

        // POST: api/users/create
        [HttpPost("create")]
        public async Task<IActionResult> Create(CreateUserCommand command)
        {
            var result = await _mediator.Send(command);

            return result.Match(
                Ok,
                errors => Problem(errors.First().Description)
            );
        }

        // PUT: api/users/update/{id}
        [HttpPut("update/{id}")]
        public async Task<IActionResult> Update(int id, UpdateUserRequest request)
        {
            var result = await _mediator.Send(
                new UpdateUserCommand(id, request.FullName, request.Email));

            return result.Match(
                Ok,
                errors => Problem(errors.First().Description)
            );
        }

        // DELETE: api/users/delete/{id}
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _mediator.Send(new DeleteUserCommand(id));

            return result.Match<IActionResult>(
                _ => NoContent(),
                errors => Problem(errors.First().Description)
            );
        }
    }
}
