using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class Account : BaseEntity
    {
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string? PasswordHash { get; set; }
        public string? GoogleId { get; set; }
        public AccountStatus Status { get; set; } = AccountStatus.PendingVerification;

        // Navigation properties
        public User? User { get; set; }
        public ICollection<AccountRefreshToken> RefreshTokens { get; set; } = new List<AccountRefreshToken>();
    }
}
