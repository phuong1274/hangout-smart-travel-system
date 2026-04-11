using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSTS.Domain.Entities
{
    public class TripActivityBudget : BaseEntity
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }

        [Required]
        [Column("TripActivityId")]
        public int TripActivityId { get; set; }

        [Column("EstimateCost")]
        public decimal EstimateCost { get; set; }

        [MaxLength(200)]
        [Column("Title")]
        public string? Title { get; set; }

        [MaxLength(500)]
        [Column("Description")]
        public string? Description { get; set; }

        [Column("ActualExpense")]
        public decimal? ActualExpense { get; set; }

        // Navigation properties
        public TripActivity TripActivity { get; set; } = null!;
    }
}
