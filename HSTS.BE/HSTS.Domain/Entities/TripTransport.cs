using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripTransport : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripActivityId { get; set; }

        [Required]
        [MaxLength(100)]
        public string TransportMethod { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = null!;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCost { get; set; }

        public int TravelTimeMinutes { get; set; }

        public int VehiclesNeeded { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CostPerPerson { get; set; }

        public int GroupSize { get; set; }

        [MaxLength(100)]
        public string? DepartureHub { get; set; }

        [MaxLength(100)]
        public string? ArrivalHub { get; set; }

        // Navigation properties
        public TripActivity TripActivity { get; set; } = null!;
    }
}
