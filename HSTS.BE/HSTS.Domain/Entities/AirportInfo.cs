namespace HSTS.Domain.Entities;

public class AirportInfo : BaseEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string IataCode { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int ProvinceId { get; set; }
    public virtual Province Province { get; set; } = null!;
}
