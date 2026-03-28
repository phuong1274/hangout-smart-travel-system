namespace HSTS.Domain.Entities
{
    public class LocationType : BaseEntity
    {
        public int LocationTypeId { get; set; }
        public string TypeName { get; set; } = null!;

        public ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}