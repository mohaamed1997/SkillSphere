using Microsoft.EntityFrameworkCore;
using SkillSphere.Application.Common;
using SkillSphere.Application.DTOs.Academic;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Entities;
using SkillSphere.Infrastructure.Persistence;

namespace SkillSphere.Infrastructure.Services;

public class AcademicService : IAcademicService
{
    private readonly SkillSphereDbContext _db;
    public AcademicService(SkillSphereDbContext db) => _db = db;

    // --- Grades ---
    public async Task<Result<List<GradeDto>>> GetGradesAsync(Guid tenantId, CancellationToken ct = default)
    {
        var grades = await _db.Grades.Where(g => g.SchoolTenantId == tenantId)
            .Include(g => g.Groups)
            .OrderBy(g => g.OrderIndex)
            .Select(g => new GradeDto { Id = g.Id, Name = g.Name, NameAr = g.NameAr, OrderIndex = g.OrderIndex, IsActive = g.IsActive, GroupCount = g.Groups.Count })
            .ToListAsync(ct);
        return Result<List<GradeDto>>.Success(grades);
    }

    public async Task<Result<GradeDto>> CreateGradeAsync(Guid tenantId, CreateGradeRequest request, CancellationToken ct = default)
    {
        var grade = new Grade { Name = request.Name, NameAr = request.NameAr, OrderIndex = request.OrderIndex, SchoolTenantId = tenantId };
        await _db.Grades.AddAsync(grade, ct);
        await _db.SaveChangesAsync(ct);
        return Result<GradeDto>.Success(new GradeDto { Id = grade.Id, Name = grade.Name, NameAr = grade.NameAr, OrderIndex = grade.OrderIndex, IsActive = true });
    }

    public async Task<Result<GradeDto>> UpdateGradeAsync(Guid id, CreateGradeRequest request, CancellationToken ct = default)
    {
        var grade = await _db.Grades.FindAsync([id], ct);
        if (grade == null) return Result<GradeDto>.Failure("Grade not found.");
        grade.Name = request.Name; grade.NameAr = request.NameAr; grade.OrderIndex = request.OrderIndex;
        await _db.SaveChangesAsync(ct);
        return Result<GradeDto>.Success(new GradeDto { Id = grade.Id, Name = grade.Name, NameAr = grade.NameAr, OrderIndex = grade.OrderIndex, IsActive = grade.IsActive });
    }

    public async Task<Result> DeleteGradeAsync(Guid id, CancellationToken ct = default)
    {
        var grade = await _db.Grades.FindAsync([id], ct);
        if (grade == null) return Result.Failure("Grade not found.");
        grade.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    // --- Groups (was Class Sections) ---
    public async Task<Result<List<GroupDto>>> GetGroupsAsync(Guid tenantId, Guid? gradeId = null, CancellationToken ct = default)
    {
        var query = _db.Groups.Include(c => c.Grade).Where(c => c.SchoolTenantId == tenantId);
        if (gradeId.HasValue) query = query.Where(c => c.GradeId == gradeId.Value);

        var items = await query.OrderBy(c => c.Grade.OrderIndex).ThenBy(c => c.Name)
            .Select(c => new GroupDto
            {
                Id = c.Id, Name = c.Name, NameAr = c.NameAr, GradeId = c.GradeId,
                GradeName = c.Grade.Name, GradeNameAr = c.Grade.NameAr,
                Capacity = c.Capacity, IsActive = c.IsActive, StudentCount = c.StudentAssignments.Count(sa => sa.IsActive)
            }).ToListAsync(ct);
        return Result<List<GroupDto>>.Success(items);
    }

    public async Task<Result<GroupDto>> CreateGroupAsync(Guid tenantId, CreateGroupRequest request, CancellationToken ct = default)
    {
        var group = new Group { Name = request.Name, NameAr = request.NameAr, GradeId = request.GradeId, Capacity = request.Capacity, SchoolTenantId = tenantId };
        await _db.Groups.AddAsync(group, ct);
        await _db.SaveChangesAsync(ct);
        var grade = await _db.Grades.FindAsync([request.GradeId], ct);
        return Result<GroupDto>.Success(new GroupDto { Id = group.Id, Name = group.Name, NameAr = group.NameAr, GradeId = group.GradeId, GradeName = grade?.Name ?? "", GradeNameAr = grade?.NameAr ?? "", Capacity = group.Capacity, IsActive = true });
    }

    public async Task<Result<GroupDto>> UpdateGroupAsync(Guid id, CreateGroupRequest request, CancellationToken ct = default)
    {
        var group = await _db.Groups.Include(c => c.Grade).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (group == null) return Result<GroupDto>.Failure("Group not found.");
        group.Name = request.Name; group.NameAr = request.NameAr; group.GradeId = request.GradeId; group.Capacity = request.Capacity;
        await _db.SaveChangesAsync(ct);
        return Result<GroupDto>.Success(new GroupDto { Id = group.Id, Name = group.Name, NameAr = group.NameAr, GradeId = group.GradeId, GradeName = group.Grade.Name, GradeNameAr = group.Grade.NameAr, Capacity = group.Capacity, IsActive = group.IsActive });
    }

    public async Task<Result> DeleteGroupAsync(Guid id, CancellationToken ct = default)
    {
        var group = await _db.Groups.FindAsync([id], ct);
        if (group == null) return Result.Failure("Group not found.");
        group.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    // --- Subjects ---
    public async Task<Result<List<SubjectDto>>> GetSubjectsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var items = await _db.Subjects.Include(s => s.Department).Where(s => s.SchoolTenantId == tenantId)
            .OrderBy(s => s.Name)
            .Select(s => new SubjectDto { Id = s.Id, Name = s.Name, NameAr = s.NameAr, Code = s.Code, DepartmentId = s.DepartmentId, DepartmentName = s.Department != null ? s.Department.Name : null, RequiredRoomType = s.RequiredRoomType, IsActive = s.IsActive })
            .ToListAsync(ct);
        return Result<List<SubjectDto>>.Success(items);
    }

    public async Task<Result<SubjectDto>> CreateSubjectAsync(Guid tenantId, CreateSubjectRequest request, CancellationToken ct = default)
    {
        var subj = new Subject { Name = request.Name, NameAr = request.NameAr, Code = request.Code, DepartmentId = request.DepartmentId, RequiredRoomType = request.RequiredRoomType, SchoolTenantId = tenantId };
        await _db.Subjects.AddAsync(subj, ct);
        await _db.SaveChangesAsync(ct);
        return Result<SubjectDto>.Success(new SubjectDto { Id = subj.Id, Name = subj.Name, NameAr = subj.NameAr, Code = subj.Code, DepartmentId = subj.DepartmentId, RequiredRoomType = subj.RequiredRoomType, IsActive = true });
    }

    public async Task<Result<SubjectDto>> UpdateSubjectAsync(Guid id, CreateSubjectRequest request, CancellationToken ct = default)
    {
        var subj = await _db.Subjects.FindAsync([id], ct);
        if (subj == null) return Result<SubjectDto>.Failure("Subject not found.");
        subj.Name = request.Name; subj.NameAr = request.NameAr; subj.Code = request.Code; subj.DepartmentId = request.DepartmentId; subj.RequiredRoomType = request.RequiredRoomType;
        await _db.SaveChangesAsync(ct);
        return Result<SubjectDto>.Success(new SubjectDto { Id = subj.Id, Name = subj.Name, NameAr = subj.NameAr, Code = subj.Code, DepartmentId = subj.DepartmentId, RequiredRoomType = subj.RequiredRoomType, IsActive = subj.IsActive });
    }

    public async Task<Result> DeleteSubjectAsync(Guid id, CancellationToken ct = default)
    {
        var subj = await _db.Subjects.FindAsync([id], ct);
        if (subj == null) return Result.Failure("Subject not found.");
        subj.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    // --- Departments ---
    public async Task<Result<List<DepartmentDto>>> GetDepartmentsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var items = await _db.Departments.Where(d => d.SchoolTenantId == tenantId)
            .Include(d => d.Subjects)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto { Id = d.Id, Name = d.Name, NameAr = d.NameAr, Description = d.Description, IsActive = d.IsActive, SubjectCount = d.Subjects.Count })
            .ToListAsync(ct);
        return Result<List<DepartmentDto>>.Success(items);
    }

    public async Task<Result<DepartmentDto>> CreateDepartmentAsync(Guid tenantId, CreateDepartmentRequest request, CancellationToken ct = default)
    {
        var dept = new Department { Name = request.Name, NameAr = request.NameAr, Description = request.Description, SchoolTenantId = tenantId };
        await _db.Departments.AddAsync(dept, ct);
        await _db.SaveChangesAsync(ct);
        return Result<DepartmentDto>.Success(new DepartmentDto { Id = dept.Id, Name = dept.Name, NameAr = dept.NameAr, Description = dept.Description, IsActive = true });
    }

    public async Task<Result<DepartmentDto>> UpdateDepartmentAsync(Guid id, CreateDepartmentRequest request, CancellationToken ct = default)
    {
        var dept = await _db.Departments.FindAsync([id], ct);
        if (dept == null) return Result<DepartmentDto>.Failure("Department not found.");
        dept.Name = request.Name; dept.NameAr = request.NameAr; dept.Description = request.Description;
        await _db.SaveChangesAsync(ct);
        return Result<DepartmentDto>.Success(new DepartmentDto { Id = dept.Id, Name = dept.Name, NameAr = dept.NameAr, Description = dept.Description, IsActive = dept.IsActive });
    }

    public async Task<Result> DeleteDepartmentAsync(Guid id, CancellationToken ct = default)
    {
        var dept = await _db.Departments.FindAsync([id], ct);
        if (dept == null) return Result.Failure("Department not found.");
        dept.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    // --- Semesters ---
    public async Task<Result<List<SemesterDto>>> GetSemestersAsync(Guid tenantId, CancellationToken ct = default)
    {
        var items = await _db.Semesters.Where(s => s.SchoolTenantId == tenantId)
            .OrderByDescending(s => s.StartDate)
            .Select(s => new SemesterDto { Id = s.Id, Name = s.Name, NameAr = s.NameAr, StartDate = s.StartDate, EndDate = s.EndDate, IsCurrent = s.IsCurrent, IsActive = s.IsActive })
            .ToListAsync(ct);
        return Result<List<SemesterDto>>.Success(items);
    }

    public async Task<Result<SemesterDto>> CreateSemesterAsync(Guid tenantId, CreateSemesterRequest request, CancellationToken ct = default)
    {
        if (request.IsCurrent)
        {
            var currentSemesters = await _db.Semesters.Where(s => s.SchoolTenantId == tenantId && s.IsCurrent).ToListAsync(ct);
            currentSemesters.ForEach(s => s.IsCurrent = false);
        }

        var sem = new Semester { Name = request.Name, NameAr = request.NameAr, StartDate = request.StartDate, EndDate = request.EndDate, IsCurrent = request.IsCurrent, SchoolTenantId = tenantId };
        await _db.Semesters.AddAsync(sem, ct);
        await _db.SaveChangesAsync(ct);
        return Result<SemesterDto>.Success(new SemesterDto { Id = sem.Id, Name = sem.Name, NameAr = sem.NameAr, StartDate = sem.StartDate, EndDate = sem.EndDate, IsCurrent = sem.IsCurrent, IsActive = true });
    }

    public async Task<Result<SemesterDto>> UpdateSemesterAsync(Guid id, CreateSemesterRequest request, CancellationToken ct = default)
    {
        var sem = await _db.Semesters.FindAsync([id], ct);
        if (sem == null) return Result<SemesterDto>.Failure("Semester not found.");

        if (request.IsCurrent && !sem.IsCurrent)
        {
            var others = await _db.Semesters.Where(s => s.SchoolTenantId == sem.SchoolTenantId && s.IsCurrent && s.Id != id).ToListAsync(ct);
            others.ForEach(s => s.IsCurrent = false);
        }

        sem.Name = request.Name; sem.NameAr = request.NameAr; sem.StartDate = request.StartDate; sem.EndDate = request.EndDate; sem.IsCurrent = request.IsCurrent;
        await _db.SaveChangesAsync(ct);
        return Result<SemesterDto>.Success(new SemesterDto { Id = sem.Id, Name = sem.Name, NameAr = sem.NameAr, StartDate = sem.StartDate, EndDate = sem.EndDate, IsCurrent = sem.IsCurrent, IsActive = sem.IsActive });
    }

    public async Task<Result> DeleteSemesterAsync(Guid id, CancellationToken ct = default)
    {
        var sem = await _db.Semesters.FindAsync([id], ct);
        if (sem == null) return Result.Failure("Semester not found.");
        sem.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
