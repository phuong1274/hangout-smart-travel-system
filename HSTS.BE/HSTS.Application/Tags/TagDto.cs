using HSTS.Domain.Entities;

namespace HSTS.Application.Tags
{
    public record TagDto(
        int Id,
        string Name,
        int? ParentTagId = null,
        string? ParentTagName = null,
        int Level = 1,
        DateTime CreatedAt = default,
        DateTime? UpdatedAt = null
    );
}
