using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkillSphere.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNameArToAllModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Subjects",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Rooms",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Groups",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Grades",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Departments",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Grades");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Departments");
        }
    }
}
