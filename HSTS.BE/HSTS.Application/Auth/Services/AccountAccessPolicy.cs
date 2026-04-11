using HSTS.Application.Auth.Interfaces;
using HSTS.Domain.Enums;

namespace HSTS.Application.Auth.Services
{
    public class AccountAccessPolicy : IAccountAccessPolicy
    {
        private readonly IAccountAccessStateLoader _loader;

        public AccountAccessPolicy(IAccountAccessStateLoader loader)
        {
            _loader = loader;
        }

        public async Task<bool> CanAccessAsync(int accountId, CancellationToken cancellationToken)
        {
            var state = await _loader.LoadAsync(accountId, cancellationToken);

            return state.Account is not null
                && state.User is not null
                && !state.Account.IsDeleted
                && !state.User.IsDeleted
                && state.Account.Status != AccountStatus.Banned;
        }
    }
}
