using HSTS.Application.Auth.Interfaces;
using HSTS.Application.Interfaces;

namespace HSTS.Infrastructure.Services
{
    public class AccountAccessStateLoader : IAccountAccessStateLoader
    {
        private readonly IAppDbContext _context;

        public AccountAccessStateLoader(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<AccountAccessState> LoadAsync(int accountId, CancellationToken cancellationToken)
        {
            var account = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);

            if (account is null)
                return new AccountAccessState(null, null);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.AccountId == accountId, cancellationToken);

            return new AccountAccessState(account, user);
        }
    }
}
