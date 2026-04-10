namespace HSTS.Domain.Entities
{
    public class AccountRefreshToken : BaseEntity
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string Token { get; set; } = null!;
        public DateTime ExpiredAt { get; set; }
        public DateTime? RevokedAt { get; set; }

        // Navigation properties
        public Account Account { get; set; } = null!;
    }
}
