namespace HSTS.Domain.Entities
{
    public class Profile : BaseEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string ProfileName { get; set; } = null!;
        public string? Address { get; set; }
        public string? AvatarUrl { get; set; }

        // Navigation properties
        public User User { get; set; } = null!;
    }
}
