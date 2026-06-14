using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SkillSphere.Infrastructure.Persistence;

/// <summary>
/// Design-time factory for EF Core tools (migrations, database updates).
/// This allows EF tools to create the DbContext without running the full app startup.
/// </summary>
public class SkillSphereDbContextFactory : IDesignTimeDbContextFactory<SkillSphereDbContext>
{
    public SkillSphereDbContext CreateDbContext(string[] args)
    {
        // Default SQLite connection string for development
        var connectionString = "Data Source=SkillSphere.db";

        // Create DbContextOptions using SQLite
        var optionsBuilder = new DbContextOptionsBuilder<SkillSphereDbContext>();
        optionsBuilder.UseSqlite(connectionString)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        return new SkillSphereDbContext(optionsBuilder.Options);
    }
}
