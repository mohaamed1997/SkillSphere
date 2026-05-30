using Microsoft.EntityFrameworkCore;
using SkillSphere.Application.Common;
using SkillSphere.Application.DTOs.Grades;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Entities;
using SkillSphere.Domain.Enums;
using SkillSphere.Domain.Interfaces;
using SkillSphere.Infrastructure.Persistence;

namespace SkillSphere.Infrastructure.Services;

public class GradeRecordService : IGradeRecordService
{
    private readonly SkillSphereDbContext _db;
    private readonly ICurrentUserService _currentUser;
    public GradeRecordService(SkillSphereDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    private async Task<List<Guid>?> GetParentLinkedStudentIdsAsync(CancellationToken ct)
    {
        if (_currentUser.Role != UserRole.Parent) return null;
        var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");
        return await _db.ParentLinks
            .Where(pl => pl.ParentProfile.UserId == userId)
            .Select(pl => pl.StudentProfileId)
            .ToListAsync(ct);
    }

    private async Task<List<Guid>?> GetTeacherTaughtStudentIdsAsync(CancellationToken ct)
    {
        if (_currentUser.Role != UserRole.Teacher) return null;
        var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");

        // Groups the teacher teaches via published timetable entries (any subject)
        var groupIds = await _db.TimetableEntries
            .Where(e => e.TeacherProfile.UserId == userId)
            .Select(e => e.TimetableVersion.GroupId)
            .Distinct()
            .ToListAsync(ct);

        if (groupIds.Count == 0) return new List<Guid>();

        // Students currently assigned to those groups
        return await _db.StudentAssignments
            .Where(sa => sa.IsActive && groupIds.Contains(sa.GroupId))
            .Select(sa => sa.StudentProfileId)
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task<Result<List<GradeRecordDto>>> GetGradeRecordsAsync(Guid tenantId, Guid? studentId, Guid? subjectId, Guid? semesterId, CancellationToken ct)
    {
        var parentChildIds = await GetParentLinkedStudentIdsAsync(ct);
        if (parentChildIds is not null)
        {
            if (parentChildIds.Count == 0) return Result<List<GradeRecordDto>>.Success(new List<GradeRecordDto>());
            if (studentId.HasValue && !parentChildIds.Contains(studentId.Value))
                return Result<List<GradeRecordDto>>.Failure("Access denied.");
        }

        var teacherStudentIds = await GetTeacherTaughtStudentIdsAsync(ct);
        if (teacherStudentIds is not null)
        {
            if (teacherStudentIds.Count == 0) return Result<List<GradeRecordDto>>.Success(new List<GradeRecordDto>());
            if (studentId.HasValue && !teacherStudentIds.Contains(studentId.Value))
                return Result<List<GradeRecordDto>>.Failure("Access denied.");
        }

        var q = _db.GradeRecords
            .Include(g => g.StudentProfile).ThenInclude(s => s.User)
            .Include(g => g.Subject)
            .Where(g => g.SchoolTenantId == tenantId);

        if (parentChildIds is not null) q = q.Where(g => parentChildIds.Contains(g.StudentProfileId));
        if (teacherStudentIds is not null) q = q.Where(g => teacherStudentIds.Contains(g.StudentProfileId));
        if (studentId.HasValue) q = q.Where(g => g.StudentProfileId == studentId.Value);
        if (subjectId.HasValue) q = q.Where(g => g.SubjectId == subjectId.Value);
        if (semesterId.HasValue) q = q.Where(g => g.SemesterId == semesterId.Value);

        var items = await q.OrderByDescending(g => g.RecordedDate).Select(g => new GradeRecordDto
        {
            Id = g.Id, StudentProfileId = g.StudentProfileId,
            StudentName = g.StudentProfile.User.FirstName + " " + g.StudentProfile.User.LastName,
            SubjectId = g.SubjectId, SubjectName = g.Subject.Name,
            Score = g.Score, LetterGrade = g.LetterGrade, MaxScore = g.MaxScore,
            AssessmentType = g.AssessmentType, Notes = g.Notes, RecordedDate = g.RecordedDate
        }).ToListAsync(ct);

        return Result<List<GradeRecordDto>>.Success(items);
    }

    public async Task<Result<GradeRecordDto>> CreateGradeRecordAsync(Guid tenantId, Guid teacherProfileId, CreateGradeRecordRequest req, CancellationToken ct)
    {
        var record = new GradeRecord
        {
            StudentProfileId = req.StudentProfileId, TeacherProfileId = teacherProfileId,
            SubjectId = req.SubjectId, SemesterId = req.SemesterId,
            Score = req.Score, LetterGrade = req.LetterGrade, MaxScore = req.MaxScore,
            AssessmentType = req.AssessmentType, Notes = req.Notes,
            RecordedDate = DateTime.UtcNow, SchoolTenantId = tenantId
        };

        await _db.GradeRecords.AddAsync(record, ct);
        await _db.SaveChangesAsync(ct);

        return Result<GradeRecordDto>.Success(new GradeRecordDto
        {
            Id = record.Id, StudentProfileId = record.StudentProfileId,
            SubjectId = record.SubjectId, Score = record.Score, LetterGrade = record.LetterGrade,
            MaxScore = record.MaxScore, AssessmentType = record.AssessmentType, Notes = record.Notes,
            RecordedDate = record.RecordedDate
        });
    }

    public async Task<Result> DeleteGradeRecordAsync(Guid id, CancellationToken ct)
    {
        var record = await _db.GradeRecords.FindAsync([id], ct);
        if (record == null) return Result.Failure("Record not found.");
        record.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result<List<BehaviorFeedbackDto>>> GetBehaviorFeedbackAsync(Guid tenantId, Guid? studentId, Guid? semesterId, CancellationToken ct)
    {
        var parentChildIds = await GetParentLinkedStudentIdsAsync(ct);
        if (parentChildIds is not null)
        {
            if (parentChildIds.Count == 0) return Result<List<BehaviorFeedbackDto>>.Success(new List<BehaviorFeedbackDto>());
            if (studentId.HasValue && !parentChildIds.Contains(studentId.Value))
                return Result<List<BehaviorFeedbackDto>>.Failure("Access denied.");
        }

        var teacherStudentIds = await GetTeacherTaughtStudentIdsAsync(ct);
        if (teacherStudentIds is not null)
        {
            if (teacherStudentIds.Count == 0) return Result<List<BehaviorFeedbackDto>>.Success(new List<BehaviorFeedbackDto>());
            if (studentId.HasValue && !teacherStudentIds.Contains(studentId.Value))
                return Result<List<BehaviorFeedbackDto>>.Failure("Access denied.");
        }

        var q = _db.BehaviorFeedbacks
            .Include(b => b.StudentProfile).ThenInclude(s => s.User)
            .Where(b => b.SchoolTenantId == tenantId);

        if (parentChildIds is not null) q = q.Where(b => parentChildIds.Contains(b.StudentProfileId));
        if (teacherStudentIds is not null) q = q.Where(b => teacherStudentIds.Contains(b.StudentProfileId));
        if (studentId.HasValue) q = q.Where(b => b.StudentProfileId == studentId.Value);
        if (semesterId.HasValue) q = q.Where(b => b.SemesterId == semesterId.Value);

        var items = await q.OrderByDescending(b => b.RecordedDate).Select(b => new BehaviorFeedbackDto
        {
            Id = b.Id, StudentProfileId = b.StudentProfileId,
            StudentName = b.StudentProfile.User.FirstName + " " + b.StudentProfile.User.LastName,
            Category = b.Category, Description = b.Description, Rating = b.Rating,
            RecordedDate = b.RecordedDate
        }).ToListAsync(ct);

        return Result<List<BehaviorFeedbackDto>>.Success(items);
    }

    public async Task<Result<BehaviorFeedbackDto>> CreateBehaviorFeedbackAsync(Guid tenantId, Guid teacherProfileId, CreateBehaviorFeedbackRequest req, CancellationToken ct)
    {
        var fb = new BehaviorFeedback
        {
            StudentProfileId = req.StudentProfileId, TeacherProfileId = teacherProfileId,
            SemesterId = req.SemesterId, Category = req.Category,
            Description = req.Description, Rating = req.Rating,
            RecordedDate = DateTime.UtcNow, SchoolTenantId = tenantId
        };

        await _db.BehaviorFeedbacks.AddAsync(fb, ct);
        await _db.SaveChangesAsync(ct);

        return Result<BehaviorFeedbackDto>.Success(new BehaviorFeedbackDto
        {
            Id = fb.Id, StudentProfileId = fb.StudentProfileId, Category = fb.Category,
            Description = fb.Description, Rating = fb.Rating, RecordedDate = fb.RecordedDate
        });
    }
}
