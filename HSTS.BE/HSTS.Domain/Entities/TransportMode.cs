using HSTS.Domain.Enums;

namespace HSTS.Domain.Entities
{
    public class TransportMode : BaseEntity
    {
        public int Id { get; set; }
        public TransportCategory Category { get; set; }
        public string Name { get; set; } = null!;
        public int Capacity { get; set; }

        public TransportModePricing? Pricing { get; set; }
        public ICollection<TransitHub> TransitHubs { get; set; } = new List<TransitHub>();
    }
}