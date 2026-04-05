using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripDay : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripId { get; set; }

        [Required]
        public int DayNumber { get; set; }

        [Required]
        [MaxLength(200)]
        public string DayTitle { get; set; } = null!;

        [MaxLength(50)]
        public string? LocationReference { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyBudgetSpent { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyBudgetLimit { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyBudgetFloor { get; set; }

        public double DailyBudgetWeight { get; set; }

        // Navigation properties
        public Trip Trip { get; set; } = null!;
        public ICollection<TripActivity> Activities { get; set; } = new List<TripActivity>();
    }
}
