
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Users.Queries
{
    public record GetUserQuery(int Id) : IRequest<ErrorOr<UserDto>>;
    public class GetUserQueryHandler : IRequestHandler<GetUserQuery, ErrorOr<UserDto>>
    {
        private readonly IRepository<User> _repository;
        public GetUserQueryHandler(IRepository<User> repository) => _repository = repository;

        public async Task<ErrorOr<UserDto>> Handle(GetUserQuery request, CancellationToken ct)
        {
            var user = await _repository.GetAsync(request.Id, ct);
            if (user is null || user.IsDeleted) return Error.NotFound("User.NotFound");

            return user.ToDto();
        }

    }

    public record GetUsersQuery() : IRequest<ErrorOr<IEnumerable<UserDto>>>;
    public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, ErrorOr<IEnumerable<UserDto>>>
    {
        private readonly IRepository<User> _repository;
        public GetUsersQueryHandler(IRepository<User> repository) => _repository = repository;

        public async Task<ErrorOr<IEnumerable<UserDto>>> Handle(GetUsersQuery request, CancellationToken ct)
        {
            var query = _repository.Query();

            query = query.Where(u => !u.IsDeleted);

            query = query.OrderByDescending(u => u.CreatedAt);

            var users = query.Select(u => u.ToDto()).ToList();

            return await Task.FromResult<ErrorOr<IEnumerable<UserDto>>>(users);
        }
    }
}
