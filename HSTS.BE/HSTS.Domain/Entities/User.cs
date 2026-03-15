using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class User : BaseEntity
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public string FullName { get; set; } = null!;
        public DateTime? DateOfBirth { get; set; }
        public Gender? Gender { get; set; }
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
        public string? Bio { get; set; }

        // Navigation properties
        public Account Account { get; set; } = null!;
        public ICollection<Profile> Profiles { get; set; } = new List<Profile>();
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
