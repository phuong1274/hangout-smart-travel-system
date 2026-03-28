namespace HSTS.Domain.Entities
{
    public class Country : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;

        public ICollection<Province> Provinces { get; set; } = new List<Province>();
    }
}