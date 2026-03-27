namespace HSTS.Domain.Entities;

public class BusStationInfo : BaseEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string StationCode { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int ProvinceId { get; set; }
    public virtual Province Province { get; set; } = null!;
}
