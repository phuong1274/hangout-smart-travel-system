namespace HSTS.API.Requests
{
    public record CreateTransportModeRequest(string Name, int Category, int Capacity);
    public record UpdateTransportModeRequest(string Name, int Category, int Capacity);
}
