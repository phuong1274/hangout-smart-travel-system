using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics;

namespace HSTS.Domain.Entities
{
    public class TripTransport : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("TripActivityId")]
        public int TripActivityId { get; set; }

        [Column("TransportModeId")]
        public int? TransportModeId { get; set; }

        [Column("DistanceKm")]
        public decimal DistanceKm { get; set; }

        [Column("TravelTimeMinutes")]
        public int TravelTimeMinutes { get; set; }

        [Column("TotalCost")]
        public decimal TotalCost { get; set; }

        [Column("Cost")]
        public decimal Cost { get; set; }

        [Column("FromYourLocation")]
        public String? YourLocationName { get; set; }

        [Column("FromTransitHubId")]
        public int? FromTransitHubId { get; set; }

        [Column("ToTransitHubId")]
        public int? ToTransitHubId { get; set; }

        [Column("FromLocationId")]
        public int? FromLocationId { get; set; }

        [Column("ToLocationId")]
        public int? ToLocationId { get; set; }

        // Navigation properties
        public TripActivity TripActivity { get; set; } = null!;
        public TransportMode? TransportMode { get; set; }
        public TransitHubs? FromTransitHub { get; set; }
        public TransitHubs? ToTransitHub { get; set; }
        public Location? FromLocation { get; set; }
        public Location? ToLocation { get; set; }
    }
}
