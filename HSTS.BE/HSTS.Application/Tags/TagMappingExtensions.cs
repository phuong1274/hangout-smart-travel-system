using HSTS.Application.Tags;
using HSTS.Domain.Entities;

namespace HSTS.Application.Tags
{
    public static class TagMappingExtensions
    {
        public static TagDto ToDto(this Tag tag, string? overrideParentName = null)
        {
            return new TagDto(
                tag.Id,
                tag.Name,
                tag.ParentTagId,
                overrideParentName ?? tag.ParentTag?.Name,
                tag.Level,
                tag.CreatedAt,
                tag.UpdatedAt
            );
        }
    }
}
