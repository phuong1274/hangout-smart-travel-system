using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSTS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNameToTripMemberAndIsJoinCodeActiveToTrip : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LocationSubmissions_Locations_CreatedLocationId",
                table: "LocationSubmissions");

            migrationBuilder.DropForeignKey(
                name: "FK_TripMembers_Users_UserId",
                table: "TripMembers");

            migrationBuilder.DropForeignKey(
                name: "FK_Trips_Users_UserId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_Trips_UserId",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_TripMembers_TripId_UserId",
                table: "TripMembers");

            migrationBuilder.DropColumn(
                name: "Cost",
                table: "TripTransports");

            migrationBuilder.DropColumn(
                name: "TotalCost",
                table: "TripTransports");

            migrationBuilder.DropColumn(
                name: "ProfileId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "ActualExpense",
                table: "TripActivityBudgets");

            migrationBuilder.AddColumn<int>(
                name: "CustomFromTransitHubId",
                table: "TripTransports",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomToTransitHubId",
                table: "TripTransports",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "EstimatedMealCost",
                table: "TripSummaries",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsJoinCodeActive",
                table: "Trips",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "JoinCode",
                table: "Trips",
                type: "varchar(10)",
                maxLength: 10,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "TripMembers",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(200)",
                oldMaxLength: 200)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "JoinedDate",
                table: "TripMembers",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CustomLocationId",
                table: "TripActivities",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "TripActivities",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "CustomLocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Latitude = table.Column<double>(type: "double", nullable: false),
                    Longitude = table.Column<double>(type: "double", nullable: false),
                    Address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomLocations", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "CustomTransitHubs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Latitude = table.Column<double>(type: "double", nullable: false),
                    Longitude = table.Column<double>(type: "double", nullable: false),
                    Address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomTransitHubs", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "LocationReviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsAnonymous = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ReportCount = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    HiddenAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    HiddenByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LocationReviews_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LocationReviews_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "PasswordSetupTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AccountId = table.Column<int>(type: "int", nullable: false),
                    Token = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExpiredAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    IsUsed = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordSetupTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordSetupTokens_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TripInvitations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TripId = table.Column<int>(type: "int", nullable: false),
                    InviterId = table.Column<int>(type: "int", nullable: false),
                    InviteeId = table.Column<int>(type: "int", nullable: false),
                    Token = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ExpirationDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TripInvitations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TripInvitations_Trips_TripId",
                        column: x => x.TripId,
                        principalTable: "Trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TripInvitations_Users_InviteeId",
                        column: x => x.InviteeId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TripInvitations_Users_InviterId",
                        column: x => x.InviterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "LocationReviewReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    LocationReviewId = table.Column<int>(type: "int", nullable: false),
                    ReporterUserId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ProcessedByUserId = table.Column<int>(type: "int", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    ResolutionNote = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    CreatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    UpdatedBy = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationReviewReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LocationReviewReports_LocationReviews_LocationReviewId",
                        column: x => x.LocationReviewId,
                        principalTable: "LocationReviews",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LocationReviewReports_Users_ReporterUserId",
                        column: x => x.ReporterUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TripTransports_CustomFromTransitHubId",
                table: "TripTransports",
                column: "CustomFromTransitHubId");

            migrationBuilder.CreateIndex(
                name: "IX_TripTransports_CustomToTransitHubId",
                table: "TripTransports",
                column: "CustomToTransitHubId");

            migrationBuilder.CreateIndex(
                name: "IX_Trips_JoinCode",
                table: "Trips",
                column: "JoinCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TripMembers_TripId",
                table: "TripMembers",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_TripActivities_CustomLocationId",
                table: "TripActivities",
                column: "CustomLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviewReports_LocationReviewId_ReporterUserId",
                table: "LocationReviewReports",
                columns: new[] { "LocationReviewId", "ReporterUserId" },
                unique: true,
                filter: "`IsDeleted` = 0");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviewReports_ReporterUserId",
                table: "LocationReviewReports",
                column: "ReporterUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviewReports_Status",
                table: "LocationReviewReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviews_LocationId",
                table: "LocationReviews",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviews_LocationId_UserId",
                table: "LocationReviews",
                columns: new[] { "LocationId", "UserId" },
                unique: true,
                filter: "`IsDeleted` = 0");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviews_Status",
                table: "LocationReviews",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LocationReviews_UserId",
                table: "LocationReviews",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordSetupTokens_AccountId",
                table: "PasswordSetupTokens",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordSetupTokens_Token",
                table: "PasswordSetupTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TripInvitations_InviteeId",
                table: "TripInvitations",
                column: "InviteeId");

            migrationBuilder.CreateIndex(
                name: "IX_TripInvitations_InviterId",
                table: "TripInvitations",
                column: "InviterId");

            migrationBuilder.CreateIndex(
                name: "IX_TripInvitations_Token",
                table: "TripInvitations",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TripInvitations_TripId_InviteeId_Status",
                table: "TripInvitations",
                columns: new[] { "TripId", "InviteeId", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_LocationSubmissions_Locations_CreatedLocationId",
                table: "LocationSubmissions",
                column: "CreatedLocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TripActivities_CustomLocations_CustomLocationId",
                table: "TripActivities",
                column: "CustomLocationId",
                principalTable: "CustomLocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TripMembers_Users_UserId",
                table: "TripMembers",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TripTransports_CustomTransitHubs_CustomFromTransitHubId",
                table: "TripTransports",
                column: "CustomFromTransitHubId",
                principalTable: "CustomTransitHubs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TripTransports_CustomTransitHubs_CustomToTransitHubId",
                table: "TripTransports",
                column: "CustomToTransitHubId",
                principalTable: "CustomTransitHubs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LocationSubmissions_Locations_CreatedLocationId",
                table: "LocationSubmissions");

            migrationBuilder.DropForeignKey(
                name: "FK_TripActivities_CustomLocations_CustomLocationId",
                table: "TripActivities");

            migrationBuilder.DropForeignKey(
                name: "FK_TripMembers_Users_UserId",
                table: "TripMembers");

            migrationBuilder.DropForeignKey(
                name: "FK_TripTransports_CustomTransitHubs_CustomFromTransitHubId",
                table: "TripTransports");

            migrationBuilder.DropForeignKey(
                name: "FK_TripTransports_CustomTransitHubs_CustomToTransitHubId",
                table: "TripTransports");

            migrationBuilder.DropTable(
                name: "CustomLocations");

            migrationBuilder.DropTable(
                name: "CustomTransitHubs");

            migrationBuilder.DropTable(
                name: "LocationReviewReports");

            migrationBuilder.DropTable(
                name: "PasswordSetupTokens");

            migrationBuilder.DropTable(
                name: "TripInvitations");

            migrationBuilder.DropTable(
                name: "LocationReviews");

            migrationBuilder.DropIndex(
                name: "IX_TripTransports_CustomFromTransitHubId",
                table: "TripTransports");

            migrationBuilder.DropIndex(
                name: "IX_TripTransports_CustomToTransitHubId",
                table: "TripTransports");

            migrationBuilder.DropIndex(
                name: "IX_Trips_JoinCode",
                table: "Trips");

            migrationBuilder.DropIndex(
                name: "IX_TripMembers_TripId",
                table: "TripMembers");

            migrationBuilder.DropIndex(
                name: "IX_TripActivities_CustomLocationId",
                table: "TripActivities");

            migrationBuilder.DropColumn(
                name: "CustomFromTransitHubId",
                table: "TripTransports");

            migrationBuilder.DropColumn(
                name: "CustomToTransitHubId",
                table: "TripTransports");

            migrationBuilder.DropColumn(
                name: "EstimatedMealCost",
                table: "TripSummaries");

            migrationBuilder.DropColumn(
                name: "IsJoinCodeActive",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "JoinCode",
                table: "Trips");

            migrationBuilder.DropColumn(
                name: "JoinedDate",
                table: "TripMembers");

            migrationBuilder.DropColumn(
                name: "CustomLocationId",
                table: "TripActivities");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "TripActivities");

            migrationBuilder.AddColumn<decimal>(
                name: "Cost",
                table: "TripTransports",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalCost",
                table: "TripTransports",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "ProfileId",
                table: "Trips",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Trips",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "TripMembers",
                keyColumn: "Name",
                keyValue: null,
                column: "Name",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "TripMembers",
                type: "varchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "ActualExpense",
                table: "TripActivityBudgets",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trips_UserId",
                table: "Trips",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TripMembers_TripId_UserId",
                table: "TripMembers",
                columns: new[] { "TripId", "UserId" });

            migrationBuilder.AddForeignKey(
                name: "FK_LocationSubmissions_Locations_CreatedLocationId",
                table: "LocationSubmissions",
                column: "CreatedLocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_TripMembers_Users_UserId",
                table: "TripMembers",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Trips_Users_UserId",
                table: "Trips",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
