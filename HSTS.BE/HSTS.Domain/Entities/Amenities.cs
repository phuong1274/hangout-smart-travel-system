namespace HSTS.Domain.Entities
{
    public class Amenities : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}
