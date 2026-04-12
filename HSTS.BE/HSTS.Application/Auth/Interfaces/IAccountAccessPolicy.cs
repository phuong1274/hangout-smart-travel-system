namespace HSTS.Application.Auth.Interfaces
{
    public interface IAccountAccessPolicy
    {
        Task<bool> CanAccessAsync(int accountId, CancellationToken cancellationToken);
    }
}
