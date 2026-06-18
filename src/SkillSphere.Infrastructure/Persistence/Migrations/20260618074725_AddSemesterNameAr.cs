using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillSphere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSemesterNameAr : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Semesters",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Semesters");
        }
    }
}
