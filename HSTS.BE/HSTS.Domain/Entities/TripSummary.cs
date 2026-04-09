using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripSummary : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("TripId")]
        public int TripId { get; set; }

        [Column("TotalBudget")]
        public decimal TotalBudget { get; set; }

        [Column("UsableBudget" )]
        public decimal UsableBudget { get; set; }

        [Column("EstimatedAccommodationCost")]
        public decimal EstimatedAccommodationCost { get; set; }

        [Column("EstimatedTransportCost")]
        public decimal EstimatedTransportCost { get; set; }

        [Column("EstimatedActivityCost")]
        public decimal EstimatedActivityCost { get; set; }

        [Column("EstimatedTotalCost")]
        public decimal EstimatedTotalCost { get; set; }

        [Column("RemainingBudget")]
        public decimal RemainingBudget { get; set; }

        [Column("ContingencyFund")]
        public decimal? ContingencyFund { get; set; }

        // Navigation properties
        public Trip Trip { get; set; } = null!;
    }
}
