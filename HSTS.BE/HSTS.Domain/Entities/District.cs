namespace HSTS.Domain.Entities
{
    public class District : BaseEntity
    {
        public int Id { get; set; }
        public int ProvinceId { get; set; }
        public string Name { get; set; } = null!;

        public Province Province { get; set; } = null!;
        public ICollection<Location> Locations { get; set; } = new List<Location>();
        public ICollection<TransitHub> TransitHubs { get; set; } = new List<TransitHub>();
    }
}