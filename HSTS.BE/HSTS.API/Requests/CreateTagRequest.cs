namespace HSTS.API.Requests
{
    public record CreateTagRequest(string Name, int? ParentTagId = null);
}
