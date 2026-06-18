using SkillSphere.Domain.Common;
using SkillSphere.Domain.Enums;

namespace SkillSphere.Domain.Entities;

public class Subject : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string? Code { get; set; }
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public RoomType? RequiredRoomType { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<TeacherSubjectLink> TeacherSubjectLinks { get; set; } = [];
    public ICollection<TimetableEntry> TimetableEntries { get; set; } = [];
    public ICollection<CurriculumContract> CurriculumContracts { get; set; } = [];
}
