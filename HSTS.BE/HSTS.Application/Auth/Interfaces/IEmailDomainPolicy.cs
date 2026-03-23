namespace HSTS.Application.Auth.Interfaces
{
    public interface IEmailDomainPolicy
    {
        bool IsAllowedEmail(string email);
    }
}
