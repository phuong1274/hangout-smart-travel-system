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

        [Column("TotalBudget", TypeName = "decimal(18,2)")]
        public decimal TotalBudget { get; set; }

        [Column("UsableBudget", TypeName = "decimal(18,2)")]
        public decimal UsableBudget { get; set; }

        [Column("EstimatedAccommodationCost", TypeName = "decimal(18,2)")]
        public decimal EstimatedAccommodationCost { get; set; }

        [Column("EstimatedTransportCost", TypeName = "decimal(18,2)")]
        public decimal EstimatedTransportCost { get; set; }

        [Column("EstimatedActivityCost", TypeName = "decimal(18,2)")]
        public decimal EstimatedActivityCost { get; set; }

        [Column("EstimatedTotalCost", TypeName = "decimal(18,2)")]
        public decimal EstimatedTotalCost { get; set; }

        [Column("RemainingBudget", TypeName = "decimal(18,2)")]
        public decimal RemainingBudget { get; set; }

        [Column("ContingencyFund", TypeName = "decimal(18,2)")]
        public decimal? ContingencyFund { get; set; }

        [Column("ActualTotalExpense", TypeName = "decimal(18,2)")]

        // Navigation properties
        public Trip Trip { get; set; } = null!;
    }
}
