namespace HSTS.Domain.Entities
{
    public class TransitHubType : BaseEntity
    {
        public int Id { get; set; }
        public string TypeName { get; set; } = null!;

        public ICollection<TransitHub> TransitHubs { get; set; } = new List<TransitHub>();
    }
}