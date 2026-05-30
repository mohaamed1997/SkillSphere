using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SkillSphere.Application.Common;
using SkillSphere.Application.DTOs.Attendance;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Entities;
using SkillSphere.Domain.Enums;
using SkillSphere.Domain.Interfaces;
using SkillSphere.Infrastructure.Persistence;

namespace SkillSphere.Infrastructure.Services;

public class AttendanceService : IAttendanceService
{
    private readonly SkillSphereDbContext _db;
    private readonly IAuditService _audit;
    private readonly ICurrentUserService _currentUser;

    public AttendanceService(SkillSphereDbContext db, IAuditService audit, ICurrentUserService currentUser)
    {
        _db = db;
        _audit = audit;
        _currentUser = currentUser;
    }

    public async Task<Result<List<AttendanceRecordDto>>> GetAttendanceAsync(Guid tenantId, DateTime date, Guid? groupId, Guid? subjectId, CancellationToken ct)
    {
        List<Guid>? parentChildIds = null;
        if (_currentUser.Role == UserRole.Parent)
        {
            var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");
            parentChildIds = await _db.ParentLinks
                .Where(pl => pl.ParentProfile.UserId == userId)
                .Select(pl => pl.StudentProfileId)
                .ToListAsync(ct);
            if (parentChildIds.Count == 0)
                return Result<List<AttendanceRecordDto>>.Success(new List<AttendanceRecordDto>());
        }

        var q = _db.AttendanceRecords
            .Include(a => a.StudentProfile).ThenInclude(s => s.User)
            .Include(a => a.Subject)
            .Include(a => a.Group)
            .Include(a => a.TimetableEntry!).ThenInclude(e => e.PeriodDefinition)
            .Where(a => a.SchoolTenantId == tenantId && a.Date.Date == date.Date);

        if (parentChildIds is not null) q = q.Where(a => parentChildIds.Contains(a.StudentProfileId));
        if (groupId.HasValue) q = q.Where(a => a.GroupId == groupId.Value);
        if (subjectId.HasValue) q = q.Where(a => a.SubjectId == subjectId.Value);

        var items = await q.OrderBy(a => a.StudentProfile.User.LastName)
            .Select(a => new AttendanceRecordDto
            {
                Id = a.Id,
                StudentProfileId = a.StudentProfileId,
                StudentName = a.StudentProfile.User.FirstName + " " + a.StudentProfile.User.LastName,
                SubjectId = a.SubjectId,
                SubjectName = a.Subject.Name,
                GroupId = a.GroupId,
                GroupName = a.Group.Name,
                TimetableEntryId = a.TimetableEntryId,
                Date = a.Date,
                SessionTime = a.SessionTime,
                PeriodLabel = a.TimetableEntry != null ? a.TimetableEntry.PeriodDefinition.Label : null,
                StartTime = a.TimetableEntry != null ? a.TimetableEntry.PeriodDefinition.StartTime : null,
                EndTime = a.TimetableEntry != null ? a.TimetableEntry.PeriodDefinition.EndTime : null,
                Status = a.Status,
                SubmissionStatus = a.SubmissionStatus,
                Notes = a.Notes,
                SubmittedAt = a.SubmittedAt,
                LastEditedAt = a.LastEditedAt,
                LastEditedBy = a.LastEditedBy,
                EditReason = a.EditReason
            }).ToListAsync(ct);

        return Result<List<AttendanceRecordDto>>.Success(items);
    }

    public async Task<Result> SubmitAttendanceAsync(Guid tenantId, Guid callerUserId, SubmitAttendanceRequest req, CancellationToken ct)
    {
        // 1. Resolve teacher profile from caller user ID
        var teacher = await _db.TeacherProfiles.FirstOrDefaultAsync(
            t => t.UserId == callerUserId && t.SchoolTenantId == tenantId, ct);
        if (teacher == null)
            return Result.Failure("Current user does not have a teacher profile in this school.");

        var teacherProfileId = teacher.Id;

        // 2. Validate timetable entry if provided
        TimetableEntry? timetableEntry = null;
        if (req.TimetableEntryId.HasValue)
        {
            timetableEntry = await _db.TimetableEntries
                .Include(e => e.TimetableVersion)
                .Include(e => e.PeriodDefinition)
                .FirstOrDefaultAsync(e => e.Id == req.TimetableEntryId.Value
                    && e.TimetableVersion.Status == TimetableStatus.Published
                    && e.SchoolTenantId == tenantId, ct);

            if (timetableEntry == null)
                return Result.Failure("Invalid or unpublished timetable entry.");
            if (timetableEntry.TeacherProfileId != teacherProfileId)
                return Result.Failure("You are not assigned to this timetable session.");
            if (timetableEntry.SubjectId != req.SubjectId)
                return Result.Failure("Subject mismatch with timetable entry.");
            if (timetableEntry.TimetableVersion.GroupId != req.GroupId)
                return Result.Failure("Group mismatch with timetable entry.");
            if (timetableEntry.DayOfWeek != req.Date.DayOfWeek)
                return Result.Failure("Day of week mismatch with timetable entry.");
        }
        else
        {
            // Fallback validation: ensure teacher has a published entry for this subject+group+day
            var dayOfWeek = req.Date.DayOfWeek;
            var hasEntry = await _db.TimetableEntries
                .Include(e => e.TimetableVersion)
                .AnyAsync(e => e.TimetableVersion.Status == TimetableStatus.Published
                    && e.TeacherProfileId == teacherProfileId
                    && e.SubjectId == req.SubjectId
                    && e.TimetableVersion.GroupId == req.GroupId
                    && e.DayOfWeek == dayOfWeek, ct);

            if (!hasEntry)
                return Result.Failure("No published timetable entry found for this teacher, subject, and group on this day.");
        }

        // 3. Server-side duplicate prevention — check for non-Draft records
        var studentIds = req.Entries.Select(e => e.StudentProfileId).ToList();
        var existingRecords = await _db.AttendanceRecords
            .Where(a => a.SchoolTenantId == tenantId
                && a.Date.Date == req.Date.Date
                && studentIds.Contains(a.StudentProfileId)
                && a.SubjectId == req.SubjectId
                && (a.TimetableEntryId == req.TimetableEntryId || a.SessionTime == req.SessionTime))
            .ToListAsync(ct);

        // If draft records exist for the same session, update them instead of creating duplicates
        var draftRecords = existingRecords.Where(r => r.SubmissionStatus == SubmissionStatus.Draft).ToList();
        var submittedRecords = existingRecords.Where(r => r.SubmissionStatus != SubmissionStatus.Draft).ToList();

        if (submittedRecords.Any())
            return Result.Failure("Attendance records have already been submitted for one or more students in this session.");

        // 4. Determine submission status
        SubmissionStatus submissionStatus;
        DateTime? submittedAt = null;

        if (req.IsDraft)
        {
            submissionStatus = SubmissionStatus.Draft;
        }
        else
        {
            submittedAt = DateTime.UtcNow;
            // Determine if submitting late: compare current time to period end time
            if (timetableEntry != null)
            {
                var sessionEndUtc = req.Date.Date.Add(timetableEntry.PeriodDefinition.EndTime);
                submissionStatus = DateTime.UtcNow > sessionEndUtc
                    ? SubmissionStatus.SubmittedLate
                    : SubmissionStatus.Submitted;
            }
            else
            {
                // Without timetable entry link, mark as Submitted
                submissionStatus = SubmissionStatus.Submitted;
            }
        }

        // 5. Create or update records
        foreach (var entry in req.Entries)
        {
            var existing = draftRecords.FirstOrDefault(r => r.StudentProfileId == entry.StudentProfileId);
            if (existing != null)
            {
                existing.Status = entry.Status;
                existing.Notes = entry.Notes;
                existing.SubmissionStatus = submissionStatus;
                existing.SubmittedAt = submittedAt;
                existing.TimetableEntryId = req.TimetableEntryId;
            }
            else
            {
                _db.AttendanceRecords.Add(new AttendanceRecord
                {
                    StudentProfileId = entry.StudentProfileId,
                    TeacherProfileId = teacherProfileId,
                    SubjectId = req.SubjectId,
                    GroupId = req.GroupId,
                    SemesterId = req.SemesterId,
                    Date = req.Date,
                    SessionTime = req.SessionTime,
                    TimetableEntryId = req.TimetableEntryId,
                    Status = entry.Status,
                    SubmissionStatus = submissionStatus,
                    Notes = entry.Notes,
                    SubmittedAt = submittedAt,
                    SchoolTenantId = tenantId
                });
            }
        }

        await _db.SaveChangesAsync(ct);

        // 6. Audit log
        if (submissionStatus != SubmissionStatus.Draft)
        {
            var user = await _db.ApplicationUsers.FindAsync([callerUserId], ct);
            await _audit.LogAsync(tenantId, callerUserId, user?.Email, "Teacher",
                AuditAction.AttendanceSubmit, "AttendanceRecord", null, null,
                JsonSerializer.Serialize(new { req.SubjectId, req.GroupId, req.Date, Status = submissionStatus.ToString(), Count = req.Entries.Count }),
                $"Attendance {submissionStatus} for {req.Entries.Count} students", ct: ct);
        }

        return Result.Success();
    }

    public async Task<Result> UpdateAttendanceAsync(Guid tenantId, Guid callerUserId, string callerRole, UpdateAttendanceEntryRequest req, CancellationToken ct)
    {
        var record = await _db.AttendanceRecords
            .Include(a => a.StudentProfile).ThenInclude(s => s.User)
            .FirstOrDefaultAsync(a => a.Id == req.AttendanceRecordId && a.SchoolTenantId == tenantId, ct);

        if (record == null)
            return Result.Failure("Attendance record not found.");

        // Authorization chain
        string authType;
        if (callerRole == nameof(UserRole.SchoolAdmin))
        {
            if (string.IsNullOrWhiteSpace(req.EditReason))
                return Result.Failure("Admin edits require a reason.");
            authType = "Admin";
        }
        else if (callerRole == nameof(UserRole.Teacher))
        {
            var teacher = await _db.TeacherProfiles.FirstOrDefaultAsync(
                t => t.UserId == callerUserId && t.SchoolTenantId == tenantId, ct);
            if (teacher == null || teacher.Id != record.TeacherProfileId)
                return Result.Failure("You can only edit your own attendance records.");

            // Check grace period
            var tenant = await _db.SchoolTenants.FindAsync([tenantId], ct);
            var gracePeriod = tenant?.GracePeriodMinutes ?? 15;

            if (record.SubmittedAt.HasValue &&
                record.SubmittedAt.Value.AddMinutes(gracePeriod) > DateTime.UtcNow)
            {
                authType = "GracePeriod";
            }
            else
            {
                // Check for active edit permission
                var now = DateTime.UtcNow;
                var hasPermission = await _db.AttendanceEditPermissions
                    .AnyAsync(p => p.SchoolTenantId == tenantId
                        && p.TeacherProfileId == teacher.Id
                        && !p.IsRevoked
                        && p.ValidFrom <= now
                        && p.ValidUntil >= now
                        && (p.TimetableEntryId == null || p.TimetableEntryId == record.TimetableEntryId), ct);

                if (!hasPermission)
                    return Result.Failure("Edit permission required. Grace period has expired and no active edit permission exists.");
                authType = "EditPermission";
            }
        }
        else
        {
            return Result.Failure("You do not have permission to edit attendance records.");
        }

        // Capture old values for audit
        var oldValues = JsonSerializer.Serialize(new { record.Status, record.Notes });

        // Apply changes
        record.Status = req.Status;
        record.Notes = req.Notes;
        record.SubmissionStatus = SubmissionStatus.Updated;
        record.LastEditedAt = DateTime.UtcNow;
        record.LastEditedBy = callerUserId.ToString();
        record.EditReason = req.EditReason;

        await _db.SaveChangesAsync(ct);

        // Audit
        var callerUser = await _db.ApplicationUsers.FindAsync([callerUserId], ct);
        var newValues = JsonSerializer.Serialize(new { req.Status, req.Notes, req.EditReason, AuthType = authType });
        await _audit.LogAsync(tenantId, callerUserId, callerUser?.Email, callerRole,
            AuditAction.AttendanceEdit, "AttendanceRecord", record.Id.ToString(),
            oldValues, newValues,
            $"Attendance edited via {authType} for student {record.StudentProfile.User.FirstName} {record.StudentProfile.User.LastName}",
            ct: ct);

        return Result.Success();
    }

    public async Task<Result<List<AttendanceRecordDto>>> GetStudentAttendanceAsync(Guid studentProfileId, Guid semesterId, CancellationToken ct)
    {
        if (_currentUser.Role == UserRole.Parent)
        {
            var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");
            var isLinked = await _db.ParentLinks.AnyAsync(pl => pl.ParentProfile.UserId == userId && pl.StudentProfileId == studentProfileId, ct);
            if (!isLinked) return Result<List<AttendanceRecordDto>>.Failure("Access denied.");
        }

        var items = await _db.AttendanceRecords
            .Include(a => a.StudentProfile).ThenInclude(s => s.User)
            .Include(a => a.Subject)
            .Include(a => a.Group)
            .Include(a => a.TimetableEntry!).ThenInclude(e => e.PeriodDefinition)
            .Where(a => a.StudentProfileId == studentProfileId && a.SemesterId == semesterId)
            .OrderByDescending(a => a.Date)
            .Select(a => new AttendanceRecordDto
            {
                Id = a.Id,
                StudentProfileId = a.StudentProfileId,
                StudentName = a.StudentProfile.User.FirstName + " " + a.StudentProfile.User.LastName,
                SubjectId = a.SubjectId,
                SubjectName = a.Subject.Name,
                GroupId = a.GroupId,
                GroupName = a.Group.Name,
                TimetableEntryId = a.TimetableEntryId,
                Date = a.Date,
                SessionTime = a.SessionTime,
                PeriodLabel = a.TimetableEntry != null ? a.TimetableEntry.PeriodDefinition.Label : null,
                StartTime = a.TimetableEntry != null ? a.TimetableEntry.PeriodDefinition.StartTime : null,
                EndTime = a.TimetableEntry != null ? a.TimetableEntry.PeriodDefinition.EndTime : null,
                Status = a.Status,
                SubmissionStatus = a.SubmissionStatus,
                Notes = a.Notes,
                SubmittedAt = a.SubmittedAt,
                LastEditedAt = a.LastEditedAt,
                LastEditedBy = a.LastEditedBy,
                EditReason = a.EditReason
            }).ToListAsync(ct);

        return Result<List<AttendanceRecordDto>>.Success(items);
    }

    public async Task<Result<List<AttendanceComplianceDto>>> GetComplianceAsync(Guid tenantId, Guid semesterId, CancellationToken ct)
    {
        var teachers = await _db.TeacherProfiles.Include(t => t.User)
            .Where(t => t.SchoolTenantId == tenantId && t.User.IsActive)
            .ToListAsync(ct);

        // Determine active school dates: distinct dates that have any non-Draft attendance in this semester
        var activeDates = await _db.AttendanceRecords
            .Where(a => a.SchoolTenantId == tenantId && a.SemesterId == semesterId
                && a.SubmissionStatus != SubmissionStatus.Draft)
            .Select(a => a.Date.Date)
            .Distinct()
            .ToListAsync(ct);

        // Pre-load each teacher's published timetable entry day-of-week list
        var allTeacherEntryDays = await _db.TimetableEntries
            .Include(e => e.TimetableVersion)
            .Where(e => e.TimetableVersion.SemesterId == semesterId
                && e.TimetableVersion.Status == TimetableStatus.Published
                && e.SchoolTenantId == tenantId)
            .Select(e => new { e.TeacherProfileId, e.DayOfWeek })
            .ToListAsync(ct);

        // Pre-load submitted counts and late counts per teacher
        var submittedCounts = await _db.AttendanceRecords
            .Where(a => a.SchoolTenantId == tenantId && a.SemesterId == semesterId
                && a.SubmissionStatus != SubmissionStatus.Draft)
            .GroupBy(a => a.TeacherProfileId)
            .Select(g => new
            {
                TeacherProfileId = g.Key,
                Count = g.Select(a => new { a.Date, a.TimetableEntryId, a.SessionTime }).Distinct().Count()
            })
            .ToListAsync(ct);

        var lateCounts = await _db.AttendanceRecords
            .Where(a => a.SchoolTenantId == tenantId && a.SemesterId == semesterId
                && a.SubmissionStatus == SubmissionStatus.SubmittedLate)
            .GroupBy(a => a.TeacherProfileId)
            .Select(g => new
            {
                TeacherProfileId = g.Key,
                Count = g.Select(a => new { a.Date, a.TimetableEntryId, a.SessionTime }).Distinct().Count()
            })
            .ToListAsync(ct);

        var result = new List<AttendanceComplianceDto>();
        foreach (var teacher in teachers)
        {
            // Expected sessions = for each active date, count how many timetable entries this teacher has for that day-of-week
            var teacherDays = allTeacherEntryDays
                .Where(e => e.TeacherProfileId == teacher.Id)
                .Select(e => e.DayOfWeek)
                .ToList();

            var expectedSessions = activeDates.Sum(d => teacherDays.Count(dow => dow == d.DayOfWeek));

            var submittedCount = submittedCounts
                .FirstOrDefault(s => s.TeacherProfileId == teacher.Id)?.Count ?? 0;

            var lateCount = lateCounts
                .FirstOrDefault(s => s.TeacherProfileId == teacher.Id)?.Count ?? 0;

            result.Add(new AttendanceComplianceDto
            {
                TeacherProfileId = teacher.Id,
                TeacherName = $"{teacher.User.FirstName} {teacher.User.LastName}",
                TotalExpectedSessions = expectedSessions,
                CompletedSessions = submittedCount,
                CompletionPercentage = expectedSessions > 0 ? Math.Round((double)submittedCount / expectedSessions * 100, 1) : 0,
                LateDays = lateCount,
                MissingSessions = Math.Max(0, expectedSessions - submittedCount)
            });
        }

        return Result<List<AttendanceComplianceDto>>.Success(result);
    }

    public async Task<Result<List<SessionComplianceDto>>> GetSessionComplianceAsync(Guid tenantId, Guid semesterId, DateTime? date, Guid? teacherProfileId, CancellationToken ct)
    {
        // Get all published timetable entries for this semester
        var entryQuery = _db.TimetableEntries
            .Include(e => e.TimetableVersion)
            .Include(e => e.PeriodDefinition)
            .Include(e => e.Subject)
            .Include(e => e.TeacherProfile).ThenInclude(t => t.User)
            .Where(e => e.SchoolTenantId == tenantId
                && e.TimetableVersion.SemesterId == semesterId
                && e.TimetableVersion.Status == TimetableStatus.Published);

        if (teacherProfileId.HasValue)
            entryQuery = entryQuery.Where(e => e.TeacherProfileId == teacherProfileId.Value);

        if (date.HasValue)
            entryQuery = entryQuery.Where(e => e.DayOfWeek == date.Value.DayOfWeek);

        var entries = await entryQuery.ToListAsync(ct);

        // Get attendance records grouped by timetable entry for the relevant date(s)
        var entryIds = entries.Select(e => e.Id).ToList();

        IQueryable<AttendanceRecord> attendanceQuery = _db.AttendanceRecords
            .Where(a => a.SchoolTenantId == tenantId
                && a.SemesterId == semesterId
                && a.TimetableEntryId != null
                && entryIds.Contains(a.TimetableEntryId!.Value)
                && a.SubmissionStatus != SubmissionStatus.Draft);

        if (date.HasValue)
            attendanceQuery = attendanceQuery.Where(a => a.Date.Date == date.Value.Date);

        var submittedSessions = await attendanceQuery
            .GroupBy(a => new { a.TimetableEntryId, a.Date })
            .Select(g => new
            {
                g.Key.TimetableEntryId,
                g.Key.Date,
                Status = g.Any(a => a.SubmissionStatus == SubmissionStatus.SubmittedLate)
                    ? "SubmittedLate"
                    : "Submitted",
                SubmittedAt = g.Min(a => a.SubmittedAt)
            })
            .ToListAsync(ct);

        // Pre-load group names for all relevant timetable versions
        var versionIds = entries.Select(e => e.TimetableVersionId).Distinct().ToList();
        var groupNames = await _db.TimetableVersions
            .Include(v => v.Group)
            .Where(v => versionIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id, v => v.Group.Name, ct);

        var result = new List<SessionComplianceDto>();
        var now = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            var group = groupNames.GetValueOrDefault(entry.TimetableVersionId, "Unknown");

            var submitted = submittedSessions
                .FirstOrDefault(s => s.TimetableEntryId == entry.Id
                    && (!date.HasValue || s.Date.Date == date.Value.Date));

            string status;
            DateTime? submittedAt;
            if (submitted != null)
            {
                status = submitted.Status;
                submittedAt = submitted.SubmittedAt;
            }
            else
            {
                // Check if the session end time has passed for "Missing" computation
                if (date.HasValue)
                {
                    var sessionEnd = date.Value.Date.Add(entry.PeriodDefinition.EndTime);
                    status = now > sessionEnd ? "Missing" : "Pending";
                }
                else
                {
                    status = "Missing"; // For date-unfiltered queries, all past sessions without records are missing
                }
                submittedAt = null;
            }

            result.Add(new SessionComplianceDto
            {
                TimetableEntryId = entry.Id,
                DayOfWeek = entry.DayOfWeek,
                PeriodLabel = entry.PeriodDefinition.Label,
                SubjectName = entry.Subject.Name,
                GroupName = group,
                TeacherName = $"{entry.TeacherProfile.User.FirstName} {entry.TeacherProfile.User.LastName}",
                SubmissionStatus = status,
                SubmittedAt = submittedAt
            });
        }

        return Result<List<SessionComplianceDto>>.Success(result.OrderBy(r => r.DayOfWeek).ThenBy(r => r.PeriodLabel).ToList());
    }

    public async Task<Result<AttendanceEditPermissionDto>> GrantEditPermissionAsync(Guid tenantId, Guid adminUserId, string adminName, GrantEditPermissionRequest req, CancellationToken ct)
    {
        // Validate teacher exists
        var teacher = await _db.TeacherProfiles.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == req.TeacherProfileId && t.SchoolTenantId == tenantId, ct);
        if (teacher == null)
            return Result<AttendanceEditPermissionDto>.Failure("Teacher profile not found.");

        // Validate timetable entry if specific
        if (req.TimetableEntryId.HasValue)
        {
            var entry = await _db.TimetableEntries
                .Include(e => e.TimetableVersion)
                .FirstOrDefaultAsync(e => e.Id == req.TimetableEntryId.Value && e.SchoolTenantId == tenantId, ct);
            if (entry == null)
                return Result<AttendanceEditPermissionDto>.Failure("Timetable entry not found.");
        }

        var permission = new AttendanceEditPermission
        {
            SchoolTenantId = tenantId,
            TeacherProfileId = req.TeacherProfileId,
            TimetableEntryId = req.TimetableEntryId,
            ValidFrom = req.ValidFrom,
            ValidUntil = req.ValidUntil,
            GrantedByUserId = adminUserId,
            GrantedByName = adminName,
            Reason = req.Reason
        };

        _db.AttendanceEditPermissions.Add(permission);
        await _db.SaveChangesAsync(ct);

        // Audit
        var adminUser = await _db.ApplicationUsers.FindAsync([adminUserId], ct);
        await _audit.LogAsync(tenantId, adminUserId, adminUser?.Email, "SchoolAdmin",
            AuditAction.AttendanceUnlock, "AttendanceEditPermission", permission.Id.ToString(),
            null, JsonSerializer.Serialize(new { req.TeacherProfileId, req.TimetableEntryId, req.ValidFrom, req.ValidUntil, req.Reason }),
            $"Edit permission granted to {teacher.User.FirstName} {teacher.User.LastName}", ct: ct);

        // Build DTO
        string? sessionLabel = null;
        if (req.TimetableEntryId.HasValue)
        {
            sessionLabel = await _db.TimetableEntries
                .Include(e => e.PeriodDefinition)
                .Where(e => e.Id == req.TimetableEntryId.Value)
                .Select(e => e.PeriodDefinition.Label + " - " + e.DayOfWeek)
                .FirstOrDefaultAsync(ct);
        }

        return Result<AttendanceEditPermissionDto>.Success(new AttendanceEditPermissionDto
        {
            Id = permission.Id,
            TeacherProfileId = teacher.Id,
            TeacherName = $"{teacher.User.FirstName} {teacher.User.LastName}",
            TimetableEntryId = req.TimetableEntryId,
            SessionLabel = sessionLabel,
            ValidFrom = req.ValidFrom,
            ValidUntil = req.ValidUntil,
            GrantedByUserId = adminUserId,
            GrantedByName = adminName,
            Reason = req.Reason,
            IsRevoked = false
        });
    }

    public async Task<Result> RevokeEditPermissionAsync(Guid permissionId, Guid adminUserId, CancellationToken ct)
    {
        var permission = await _db.AttendanceEditPermissions.FindAsync([permissionId], ct);
        if (permission == null)
            return Result.Failure("Edit permission not found.");

        permission.IsRevoked = true;
        permission.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var adminUser = await _db.ApplicationUsers.FindAsync([adminUserId], ct);
        await _audit.LogAsync(permission.SchoolTenantId, adminUserId, adminUser?.Email, "SchoolAdmin",
            AuditAction.AttendanceUnlock, "AttendanceEditPermission", permissionId.ToString(),
            null, JsonSerializer.Serialize(new { Action = "Revoked" }),
            "Edit permission revoked", ct: ct);

        return Result.Success();
    }

    public async Task<Result<List<AttendanceEditPermissionDto>>> GetEditPermissionsAsync(Guid tenantId, Guid? teacherProfileId, CancellationToken ct)
    {
        var q = _db.AttendanceEditPermissions
            .Include(p => p.TeacherProfile).ThenInclude(t => t.User)
            .Include(p => p.TimetableEntry!).ThenInclude(e => e.PeriodDefinition)
            .Where(p => p.SchoolTenantId == tenantId);

        if (teacherProfileId.HasValue)
            q = q.Where(p => p.TeacherProfileId == teacherProfileId.Value);

        var items = await q.OrderByDescending(p => p.CreatedAt)
            .Select(p => new AttendanceEditPermissionDto
            {
                Id = p.Id,
                TeacherProfileId = p.TeacherProfileId,
                TeacherName = p.TeacherProfile.User.FirstName + " " + p.TeacherProfile.User.LastName,
                TimetableEntryId = p.TimetableEntryId,
                SessionLabel = p.TimetableEntry != null
                    ? p.TimetableEntry.PeriodDefinition.Label + " - " + p.TimetableEntry.DayOfWeek
                    : null,
                ValidFrom = p.ValidFrom,
                ValidUntil = p.ValidUntil,
                GrantedByUserId = p.GrantedByUserId,
                GrantedByName = p.GrantedByName,
                Reason = p.Reason,
                IsRevoked = p.IsRevoked,
                RevokedAt = p.RevokedAt
            }).ToListAsync(ct);

        return Result<List<AttendanceEditPermissionDto>>.Success(items);
    }
}
