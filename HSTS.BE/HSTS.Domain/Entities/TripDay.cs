using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripDay : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("TripId")]
        public int TripId { get; set; }

        [Required]
        [Column("DayNumber")]
        public int DayNumber { get; set; }

        [Required]
        [Column("Date")]
        public DateTime Date { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("DayTitle")]
        public string DayTitle { get; set; } = null!;

        [MaxLength(200)]
        [Column("WeatherSummary")]
        public string? WeatherSummary { get; set; }

        [Column("EstimateCost")]
        public decimal EstimateCost { get; set; }

        // Navigation properties
        public Trip Trip { get; set; } = null!;
        public ICollection<TripActivity> Activities { get; set; } = new List<TripActivity>();
    }
}
