namespace HSTS.Application.Interfaces
{
    public interface ICurrentUserService
    {
        int AccountId { get; }
        int UserId { get; }
    }
}
