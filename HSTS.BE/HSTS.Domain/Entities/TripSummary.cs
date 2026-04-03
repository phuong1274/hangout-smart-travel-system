using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripSummary : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int TripId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalEstimatedCost { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AccommodationTotal { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TransportTotal { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal FoodTotal { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ActivityTotal { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? RemainingContingencyFund { get; set; }

        public decimal? ContingencyFundPercentage { get; set; }

        public bool IsBudgetInsufficient { get; set; }

        [MaxLength(500)]
        public string? BudgetWarning { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MinimumRecommendedBudget { get; set; }

        // Navigation properties
        public Trip Trip { get; set; } = null!;
    }
}
