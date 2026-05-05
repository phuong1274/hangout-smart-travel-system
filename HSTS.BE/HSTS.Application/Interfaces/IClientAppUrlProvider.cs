namespace HSTS.Application.Interfaces
{
    public interface IClientAppUrlProvider
    {
        string BaseUrl { get; }
        string BuildUrl(string path, IReadOnlyDictionary<string, string?> queryParameters);
    }
}
