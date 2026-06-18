using SkillSphere.Domain.Common;
using SkillSphere.Domain.Enums;

namespace SkillSphere.Domain.Entities;

public class Room : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public RoomType RoomType { get; set; }
    public int Capacity { get; set; }
    public string? Building { get; set; }
    public int? Floor { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<TimetableEntry> TimetableEntries { get; set; } = [];
}
