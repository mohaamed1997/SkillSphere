using SkillSphere.Domain.Common;

namespace SkillSphere.Domain.Entities;

public class Department : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Subject> Subjects { get; set; } = [];
    public ICollection<SupervisorScope> SupervisorScopes { get; set; } = [];
}
