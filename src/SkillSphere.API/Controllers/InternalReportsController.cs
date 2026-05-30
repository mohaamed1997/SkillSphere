using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SkillSphere.Application.DTOs.Reports;
using SkillSphere.Application.Common;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Interfaces;

namespace SkillSphere.API.Controllers;

[ApiController]
[Route("api/internal-reports")]
[Authorize(Roles = "Teacher,TeacherSupervisor,SchoolManager,SchoolAdmin,Parent")]
public class InternalReportsController : ControllerBase
{
    private readonly IInternalReportService _reportService;
    private readonly ICurrentUserService _currentUser;

    public InternalReportsController(IInternalReportService reportService, ICurrentUserService currentUser)
    {
        _reportService = reportService;
        _currentUser = currentUser;
    }

    private Guid TenantId => _currentUser.SchoolTenantId ?? throw new UnauthorizedAccessException("Tenant context required.");
    private Guid UserId => _currentUser.UserId!.Value;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? supervisorId, [FromQuery] Guid? reporterId,
        [FromQuery] PaginationParams paging, CancellationToken ct)
        => Ok((await _reportService.GetReportsAsync(TenantId, supervisorId, reporterId, paging, ct)).Data);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var r = await _reportService.GetByIdAsync(id, ct);
        return r.IsSuccess ? Ok(r.Data) : NotFound(new { error = r.Error });
    }

    [HttpPost]
    [Authorize(Roles = "Teacher,TeacherSupervisor")]
    public async Task<IActionResult> Create([FromQuery] Guid teacherProfileId,
        [FromBody] CreateInternalReportRequest req, CancellationToken ct)
    {
        var r = await _reportService.CreateAsync(TenantId, teacherProfileId, req, ct);
        return r.IsSuccess ? Ok(r.Data) : BadRequest(new { error = r.Error });
    }

    [HttpPost("{id:guid}/comments")]
    [Authorize(Roles = "Teacher,TeacherSupervisor,SchoolManager,SchoolAdmin")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] AddInternalReportCommentRequest req, CancellationToken ct)
    {
        var r = await _reportService.AddCommentAsync(id, UserId, req, ct);
        return r.IsSuccess ? Ok() : BadRequest(new { error = r.Error });
    }

    [HttpPost("{id:guid}/escalate")]
    [Authorize(Roles = "Teacher,TeacherSupervisor,SchoolManager,SchoolAdmin")]
    public async Task<IActionResult> Escalate(Guid id, [FromBody] EscalateInternalReportRequest req, CancellationToken ct)
    {
        var r = await _reportService.EscalateAsync(id, req, ct);
        return r.IsSuccess ? Ok() : BadRequest(new { error = r.Error });
    }

    [HttpPost("{id:guid}/resolve")]
    [Authorize(Roles = "Teacher,TeacherSupervisor,SchoolManager,SchoolAdmin")]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken ct)
    {
        var r = await _reportService.ResolveAsync(id, ct);
        return r.IsSuccess ? Ok() : BadRequest(new { error = r.Error });
    }
}
