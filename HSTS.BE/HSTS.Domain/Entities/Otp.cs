using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class Otp : BaseEntity
    {
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string Code { get; set; } = null!;
        public OtpType Type { get; set; }
        public DateTime ExpiredAt { get; set; }
        public bool IsUsed { get; set; } = false;
    }
}
