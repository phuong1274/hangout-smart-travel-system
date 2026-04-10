using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    /// <summary>
    /// Stores user-defined transit hubs that don't exist in the main TransitHubs table.
    /// Used when users add custom transit hubs to their trip transports.
    /// </summary>
    public class CustomTransitHub : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("Name")]
        public string Name { get; set; } = null!;

        [Required]
        [Column("Latitude")]
        public double Latitude { get; set; }

        [Required]
        [Column("Longitude")]
        public double Longitude { get; set; }

        [MaxLength(500)]
        [Column("Address")]
        public string? Address { get; set; }


        // Navigation properties
        public ICollection<TripTransport> FromTransitHubTransports { get; set; } = new List<TripTransport>();
        public ICollection<TripTransport> ToTransitHubTransports { get; set; } = new List<TripTransport>();
    }
}
