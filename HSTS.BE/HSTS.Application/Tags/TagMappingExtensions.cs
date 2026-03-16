using HSTS.Application.Tags;
using HSTS.Domain.Entities;

namespace HSTS.Application.Tags
{
    public static class TagMappingExtensions
    {
        public static TagDto ToDto(this Tag tag)
        {
            return new TagDto(
                tag.Id,
                tag.Name,
                tag.CreatedAt,
                tag.UpdatedAt
            );
        }
    }
}
