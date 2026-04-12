namespace HSTS.Domain.Entities
{
    public class PasswordSetupToken : BaseEntity
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public Account Account { get; set; } = null!;
        public string Token { get; set; } = null!;
        public DateTime ExpiredAt { get; set; }
        public bool IsUsed { get; set; }
    }
}
