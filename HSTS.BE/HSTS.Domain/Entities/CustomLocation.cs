using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    /// <summary>
    /// Stores user-defined locations that don't exist in the main Location table.
    /// Used when users add custom locations to their trip activities.
    /// </summary>
    public class CustomLocation : BaseEntity
    {
        [Required]
        [ForeignKey("LocationType")]
        public int LocationTypeId { get; set; }

        public LocationType LocationType { get; set; } = null!;
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

        [MaxLength(1000)]
        [Column("Description")]
        public string? Description { get; set; }

        // Navigation property
        public ICollection<TripActivity> TripActivities { get; set; } = new List<TripActivity>();
    }
}
