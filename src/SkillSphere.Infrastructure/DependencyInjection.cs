using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SkillSphere.Application.Interfaces;
using SkillSphere.Domain.Common;
using SkillSphere.Domain.Interfaces;
using SkillSphere.Infrastructure.Persistence;
using SkillSphere.Infrastructure.Repositories;
using SkillSphere.Infrastructure.Services;

namespace SkillSphere.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<SkillSphereDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection"))
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Services
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAcademicService, AcademicService>();
        services.AddScoped<IAssignmentService, AssignmentService>();
        services.AddScoped<ITimetableService, TimetableService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IGradeRecordService, GradeRecordService>();
        services.AddScoped<IWeeklyReportService, WeeklyReportService>();
        services.AddScoped<IInternalReportService, InternalReportService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IFeatureFlagService, FeatureFlagService>();
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IPeriodDefinitionService, PeriodDefinitionService>();
        services.AddScoped<IRoomService, RoomService>();
        services.AddScoped<ICurriculumService, CurriculumService>();
        services.AddScoped<ITeacherSubjectLinkService, TeacherSubjectLinkService>();

        return services;
    }
}
