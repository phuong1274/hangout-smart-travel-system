namespace HSTS.Application.Auth.Interfaces
{
    public interface IAccountAccessStateLoader
    {
        Task<AccountAccessState> LoadAsync(int accountId, CancellationToken cancellationToken);
    }

    public record AccountAccessState(Account? Account, User? User);
}
