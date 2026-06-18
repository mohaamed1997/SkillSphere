using SkillSphere.Domain.Common;

namespace SkillSphere.Domain.Entities;

public class Grade : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Group> Groups { get; set; } = [];
    public ICollection<StudentAssignment> StudentAssignments { get; set; } = [];
    public ICollection<CurriculumContract> CurriculumContracts { get; set; } = [];
}
