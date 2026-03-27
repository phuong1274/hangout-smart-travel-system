using System;

namespace HSTS.Domain.Entities;

public class ItineraryItem : BaseEntity
{
    public int Id { get; set; }
    public int ItineraryId { get; set; }
    public int? LocationId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime ArrivalTime { get; set; }
    public DateTime DepartureTime { get; set; }
    public double Cost { get; set; }
    public bool IsTransport { get; set; }

    // Navigation properties
    public virtual Itinerary Itinerary { get; set; } = null!;
    public virtual Location? Location { get; set; }
}
