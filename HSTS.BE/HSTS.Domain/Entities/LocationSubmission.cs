using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HSTS.Domain.Entities;

namespace HSTS.Domain.Entities
{
    public class LocationSubmission : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        // User who submitted
        [Required]
        public int UserId { get; set; }
        public User? User { get; set; }

        // Location info
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = null!;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [Required]
        [Range(-90, 90)]
        public double Latitude { get; set; }

        [Required]
        [Range(-180, 180)]
        public double Longitude { get; set; }

        [Required]
        [MaxLength(300)]
        public string Address { get; set; } = null!;

        [MaxLength(50)]
        public string? Telephone { get; set; }

        [EmailAddress]
        [MaxLength(200)]
        public string? Email { get; set; }

        // Pricing
        [Column(TypeName = "decimal(18,2)")]
        [Range(0, 100000000)]
        public decimal? PriceMinUsd { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        [Range(0, 100000000)]
        public decimal? PriceMaxUsd { get; set; }

        [Range(0, 5)]
        public decimal? Score { get; set; }

        // Links
        public int? DestinationId { get; set; }
        public Destination? Destination { get; set; }

        public int? LocationTypeId { get; set; }
        public LocationType? LocationType { get; set; }

        // Media links (stored as JSON)
        [MaxLength(4000)]
        public string? MediaLinksJson { get; set; }

        // Social links (stored as JSON)
        [MaxLength(4000)]
        public string? SocialLinksJson { get; set; }

        // Amenities (stored as JSON array of IDs)
        [MaxLength(1000)]
        public string? AmenityIdsJson { get; set; }

        // Tags (stored as JSON array of IDs)
        [MaxLength(1000)]
        public string? TagIdsJson { get; set; }

        // Opening hours (stored as JSON array)
        [MaxLength(4000)]
        public string? OpeningHoursJson { get; set; }

        // Seasons (stored as JSON array)
        [MaxLength(4000)]
        public string? SeasonsJson { get; set; }

        // Proposed changes for edit submissions (stored as JSON)
        [MaxLength(4000)]
        public string? ProposedChangesJson { get; set; }

        // Status
        public SubmissionStatus Status { get; set; } = SubmissionStatus.Pending;

        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        public DateTime? ReviewedAt { get; set; }

        [MaxLength(450)]
        public string? ReviewedBy { get; set; }

        // Link to existing location (for edit submissions)
        public int? ExistingLocationId { get; set; }
        public Location? ExistingLocation { get; set; }

        // Link to created Location (after approval for new location submissions)
        public int? CreatedLocationId { get; set; }
        public Location? CreatedLocation { get; set; }

        // Type of submission
        public SubmissionType SubmissionType { get; set; } = SubmissionType.NewLocation;
    }

    public enum SubmissionStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2,
        Published = 3
    }

    public enum SubmissionType
    {
        NewLocation = 0,      // User submits a new location
        EditExisting = 1,     // User suggests edits to existing location
    }
}
