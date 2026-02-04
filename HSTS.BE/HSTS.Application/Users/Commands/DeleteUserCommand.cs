using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static HSTS.Application.Interfaces.IRepository;

namespace HSTS.Application.Users.Commands
{
    public record DeleteUserCommand(int Id) : IRequest<ErrorOr<Deleted>>;

    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, ErrorOr<Deleted>>
    {
        private readonly IRepository<User> _repository;
        public DeleteUserCommandHandler(IRepository<User> repository) => _repository = repository;

        public async Task<ErrorOr<Deleted>> Handle(DeleteUserCommand request, CancellationToken ct)
        {
            var user = await _repository.GetAsync(request.Id, ct);
            if (user is null) return Error.NotFound();

            user.IsDeleted = true;
            await _repository.UpdateAsync(user, ct);

            return Result.Deleted;
        }
    }
}
