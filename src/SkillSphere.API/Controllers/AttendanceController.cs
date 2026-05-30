using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillSphere.Application.DTOs.Attendance;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Enums;
using SkillSphere.Domain.Interfaces;

namespace SkillSphere.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly ICurrentUserService _currentUser;

    public AttendanceController(IAttendanceService attendanceService, ICurrentUserService currentUser)
    {
        _attendanceService = attendanceService;
        _currentUser = currentUser;
    }

    private Guid TenantId => _currentUser.SchoolTenantId ?? throw new UnauthorizedAccessException("Tenant context required.");
    private Guid UserId => _currentUser.UserId ?? throw new UnauthorizedAccessException("User context required.");
    private string RoleName => _currentUser.Role?.ToString() ?? throw new UnauthorizedAccessException("Role context required.");
    private string UserFullName => _currentUser.Email ?? "Unknown";

    [HttpPost("submit")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Submit([FromBody] SubmitAttendanceRequest req, CancellationToken ct)
    {
        var r = await _attendanceService.SubmitAttendanceAsync(TenantId, UserId, req, ct);
        return r.IsSuccess ? Ok() : BadRequest(new { error = r.Error });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Teacher,SchoolAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAttendanceEntryRequest req, CancellationToken ct)
    {
        req.AttendanceRecordId = id;
        var r = await _attendanceService.UpdateAttendanceAsync(TenantId, UserId, RoleName, req, ct);
        return r.IsSuccess ? Ok() : BadRequest(new { error = r.Error });
    }

    [HttpGet]
    [Authorize(Roles = "Teacher,TeacherSupervisor,SchoolManager,SchoolAdmin,Parent")]
    public async Task<IActionResult> Get([FromQuery] DateTime date, [FromQuery] Guid? groupId,
        [FromQuery] Guid? subjectId, CancellationToken ct)
        => Ok((await _attendanceService.GetAttendanceAsync(TenantId, date, groupId, subjectId, ct)).Data);

    [HttpGet("student/{studentProfileId:guid}")]
    [Authorize(Roles = "Teacher,TeacherSupervisor,SchoolManager,SchoolAdmin,Parent,Student")]
    public async Task<IActionResult> GetByStudent(Guid studentProfileId, [FromQuery] Guid semesterId, CancellationToken ct)
        => Ok((await _attendanceService.GetStudentAttendanceAsync(studentProfileId, semesterId, ct)).Data);

    [HttpGet("compliance")]
    [Authorize(Roles = "TeacherSupervisor,SchoolManager,SchoolAdmin")]
    public async Task<IActionResult> GetCompliance([FromQuery] Guid semesterId, CancellationToken ct)
        => Ok((await _attendanceService.GetComplianceAsync(TenantId, semesterId, ct)).Data);

    [HttpGet("session-compliance")]
    [Authorize(Roles = "TeacherSupervisor,SchoolManager,SchoolAdmin")]
    public async Task<IActionResult> GetSessionCompliance([FromQuery] Guid semesterId,
        [FromQuery] DateTime? date, [FromQuery] Guid? teacherProfileId, CancellationToken ct)
        => Ok((await _attendanceService.GetSessionComplianceAsync(TenantId, semesterId, date, teacherProfileId, ct)).Data);

    [HttpPost("edit-permissions")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> GrantEditPermission([FromBody] GrantEditPermissionRequest req, CancellationToken ct)
    {
        var r = await _attendanceService.GrantEditPermissionAsync(TenantId, UserId, UserFullName, req, ct);
        return r.IsSuccess ? Ok(r.Data) : BadRequest(new { error = r.Error });
    }

    [HttpDelete("edit-permissions/{id:guid}")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> RevokeEditPermission(Guid id, CancellationToken ct)
    {
        var r = await _attendanceService.RevokeEditPermissionAsync(id, UserId, ct);
        return r.IsSuccess ? Ok() : BadRequest(new { error = r.Error });
    }

    [HttpGet("edit-permissions")]
    [Authorize(Roles = "SchoolAdmin")]
    public async Task<IActionResult> GetEditPermissions([FromQuery] Guid? teacherProfileId, CancellationToken ct)
        => Ok((await _attendanceService.GetEditPermissionsAsync(TenantId, teacherProfileId, ct)).Data);
}
