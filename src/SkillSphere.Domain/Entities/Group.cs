using SkillSphere.Domain.Common;

namespace SkillSphere.Domain.Entities;

public class Group : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public Guid GradeId { get; set; }
    public Grade Grade { get; set; } = null!;
    public int Capacity { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<StudentAssignment> StudentAssignments { get; set; } = [];
    public ICollection<TimetableVersion> TimetableVersions { get; set; } = [];
}
