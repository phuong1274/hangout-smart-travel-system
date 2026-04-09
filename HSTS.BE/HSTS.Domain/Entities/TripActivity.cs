using HSTS.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripActivity : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("TripDayId")]
        public int TripDayId { get; set; }

        [Required]
        [Column("Type")]
        public ActivityType Type { get; set; }

        [Required]
        [MaxLength(500)]
        [Column("Title")]
        public string Title { get; set; } = null!;

        [Column("StartTime")]
        public TimeOnly? StartTime { get; set; }

        [Column("EndTime")]
        public TimeOnly? EndTime { get; set; }

        [Column("LocationId")]
        public int? LocationId { get; set; }

        // Navigation properties
        public TripDay TripDay { get; set; } = null!;
        public Location? Location { get; set; }
        public TripTransport? Transport { get; set; }
        public TripActivityBudget? Budget { get; set; }
    }
}
