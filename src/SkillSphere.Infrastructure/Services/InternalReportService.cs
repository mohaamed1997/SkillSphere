using Microsoft.EntityFrameworkCore;
using SkillSphere.Application.Common;
using SkillSphere.Application.DTOs.Reports;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Entities;
using SkillSphere.Domain.Enums;
using SkillSphere.Domain.Interfaces;
using SkillSphere.Infrastructure.Persistence;

namespace SkillSphere.Infrastructure.Services;

public class InternalReportService : IInternalReportService
{
    private readonly SkillSphereDbContext _db;
    private readonly ICurrentUserService _currentUser;
    public InternalReportService(SkillSphereDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<PagedResult<InternalReportDto>>> GetReportsAsync(Guid tenantId, Guid? supervisorId, Guid? reporterId, PaginationParams? p, CancellationToken ct)
    {
        p ??= new PaginationParams();

        List<Guid>? parentChildIds = null;
        if (_currentUser.Role == UserRole.Parent)
        {
            var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");
            parentChildIds = await _db.ParentLinks
                .Where(pl => pl.ParentProfile.UserId == userId)
                .Select(pl => pl.StudentProfileId)
                .ToListAsync(ct);

            if (parentChildIds.Count == 0)
                return Result<PagedResult<InternalReportDto>>.Success(new PagedResult<InternalReportDto>
                { Items = new List<InternalReportDto>(), TotalCount = 0, Page = p.Page, PageSize = p.PageSize });
        }

        var q = _db.InternalReports
            .Include(r => r.ReporterTeacher).ThenInclude(t => t.User)
            .Include(r => r.StudentProfile).ThenInclude(s => s!.User)
            .Include(r => r.AssignedSupervisor).ThenInclude(s => s!.User)
            .Include(r => r.EscalatedToUser)
            .Include(r => r.Comments).ThenInclude(c => c.AuthorUser)
            .Where(r => r.SchoolTenantId == tenantId);

        if (parentChildIds is not null)
            q = q.Where(r => r.StudentProfileId != null && parentChildIds.Contains(r.StudentProfileId.Value));

        if (supervisorId.HasValue) q = q.Where(r => r.AssignedSupervisorId == supervisorId.Value);
        if (reporterId.HasValue) q = q.Where(r => r.ReporterTeacherProfileId == reporterId.Value);

        var total = await q.CountAsync(ct);
        var data = await q.OrderByDescending(r => r.CreatedAt)
            .Skip((p.Page - 1) * p.PageSize).Take(p.PageSize)
            .ToListAsync(ct);
        var items = data.Select(MapDto).ToList();

        return Result<PagedResult<InternalReportDto>>.Success(new PagedResult<InternalReportDto>
        { Items = items, TotalCount = total, Page = p.Page, PageSize = p.PageSize });
    }

    public async Task<Result<InternalReportDto>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var r = await _db.InternalReports
            .Include(r => r.ReporterTeacher).ThenInclude(t => t.User)
            .Include(r => r.StudentProfile).ThenInclude(s => s!.User)
            .Include(r => r.AssignedSupervisor).ThenInclude(s => s!.User)
            .Include(r => r.EscalatedToUser)
            .Include(r => r.Comments).ThenInclude(c => c.AuthorUser)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (r == null) return Result<InternalReportDto>.Failure("Report not found.");

        if (_currentUser.Role == UserRole.Parent)
        {
            var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");
            if (r.StudentProfileId == null) return Result<InternalReportDto>.Failure("Access denied.");
            var isLinked = await _db.ParentLinks.AnyAsync(pl => pl.ParentProfile.UserId == userId && pl.StudentProfileId == r.StudentProfileId, ct);
            if (!isLinked) return Result<InternalReportDto>.Failure("Access denied.");
        }

        return Result<InternalReportDto>.Success(MapDto(r));
    }

    public async Task<Result<InternalReportDto>> CreateAsync(Guid tenantId, Guid teacherProfileId, CreateInternalReportRequest req, CancellationToken ct)
    {
        // Auto-assign to a supervisor in scope (if exists)
        Guid? supervisorId = null;
        if (req.StudentProfileId.HasValue)
        {
            var studentAssignment = await _db.StudentAssignments
                .Where(sa => sa.StudentProfileId == req.StudentProfileId && sa.IsActive)
                .FirstOrDefaultAsync(ct);

            if (studentAssignment != null)
            {
                var scope = await _db.SupervisorScopes
                    .FirstOrDefaultAsync(s => s.IsActive &&
                        (s.GradeId == null || s.GradeId == studentAssignment.GradeId) &&
                        (s.GroupId == null || s.GroupId == studentAssignment.GroupId), ct);
                supervisorId = scope?.TeacherProfileId;
            }
        }

        var report = new InternalReport
        {
            ReporterTeacherProfileId = teacherProfileId,
            StudentProfileId = req.StudentProfileId,
            AssignedSupervisorId = supervisorId,
            Category = req.Category,
            Title = req.Title,
            Description = req.Description,
            AttachmentUrls = req.AttachmentUrls,
            SchoolTenantId = tenantId
        };

        await _db.InternalReports.AddAsync(report, ct);
        await _db.SaveChangesAsync(ct);

        return Result<InternalReportDto>.Success(new InternalReportDto
        {
            Id = report.Id, Category = report.Category, Status = report.Status,
            Title = report.Title, Description = report.Description,
            CreatedAt = report.CreatedAt
        });
    }

    public async Task<Result> AddCommentAsync(Guid reportId, Guid userId, AddInternalReportCommentRequest req, CancellationToken ct)
    {
        var report = await _db.InternalReports.FindAsync([reportId], ct);
        if (report == null) return Result.Failure("Report not found.");

        var comment = new InternalReportComment
        {
            InternalReportId = reportId, AuthorUserId = userId,
            Content = req.Content, IsDecisionNote = req.IsDecisionNote
        };

        report.Status = InternalReportStatus.UnderReview;
        await _db.InternalReportComments.AddAsync(comment, ct);
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> EscalateAsync(Guid reportId, EscalateInternalReportRequest req, CancellationToken ct)
    {
        var report = await _db.InternalReports
            .Include(r => r.AssignedSupervisor)
            .Include(r => r.ReporterTeacher)
            .FirstOrDefaultAsync(r => r.Id == reportId, ct);
        if (report == null) return Result.Failure("Report not found.");

        report.Status = InternalReportStatus.Escalated;
        report.EscalatedToUserId = req.EscalateToUserId;
        report.EscalatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(req.Notes))
        {
            // Use the User ID (not the TeacherProfile ID) to avoid FK violation
            var authorUserId = report.AssignedSupervisor?.UserId ?? report.ReporterTeacher?.UserId ?? Guid.Empty;
            await _db.InternalReportComments.AddAsync(new InternalReportComment
            {
                InternalReportId = reportId,
                AuthorUserId = authorUserId,
                Content = req.Notes,
                IsDecisionNote = true
            }, ct);
        }

        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> ResolveAsync(Guid reportId, CancellationToken ct)
    {
        var report = await _db.InternalReports.FindAsync([reportId], ct);
        if (report == null) return Result.Failure("Report not found.");

        report.Status = InternalReportStatus.Resolved;
        report.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }

    private static InternalReportDto MapDto(InternalReport r) => new()
    {
        Id = r.Id,
        ReporterName = r.ReporterTeacher != null ? $"{r.ReporterTeacher.User.FirstName} {r.ReporterTeacher.User.LastName}" : "",
        StudentName = r.StudentProfile != null ? $"{r.StudentProfile.User.FirstName} {r.StudentProfile.User.LastName}" : null,
        StudentProfileId = r.StudentProfileId,
        AssignedSupervisorName = r.AssignedSupervisor != null ? $"{r.AssignedSupervisor.User.FirstName} {r.AssignedSupervisor.User.LastName}" : null,
        Category = r.Category, Status = r.Status,
        Title = r.Title, Description = r.Description,
        AttachmentUrls = r.AttachmentUrls,
        EscalatedToName = r.EscalatedToUser != null ? $"{r.EscalatedToUser.FirstName} {r.EscalatedToUser.LastName}" : null,
        EscalatedAt = r.EscalatedAt, ResolvedAt = r.ResolvedAt, CreatedAt = r.CreatedAt,
        Comments = r.Comments?.Select(c => new InternalReportCommentDto
        {
            Id = c.Id, AuthorName = $"{c.AuthorUser.FirstName} {c.AuthorUser.LastName}",
            Content = c.Content, IsDecisionNote = c.IsDecisionNote, CreatedAt = c.CreatedAt
        }).ToList() ?? []
    };
}
