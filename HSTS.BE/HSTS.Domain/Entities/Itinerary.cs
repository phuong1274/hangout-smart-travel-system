using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities;

public class Itinerary : BaseEntity
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public double TotalBudget { get; set; }
    public double ActualCost { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual ICollection<ItineraryItem> ItineraryItems { get; set; } = new List<ItineraryItem>();
}
