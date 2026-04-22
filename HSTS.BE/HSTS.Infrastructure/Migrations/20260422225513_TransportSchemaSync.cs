using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSTS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TransportSchemaSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "CostPerKm",
                table: "LocalTransportMetrics",
                newName: "PricePerKm");

            migrationBuilder.AddColumn<decimal>(
                name: "BaseDistance",
                table: "LocalTransportMetrics",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseFare",
                table: "LocalTransportMetrics",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CongestionFeePerMinute",
                table: "LocalTransportMetrics",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LongDistancePricePerKm",
                table: "LocalTransportMetrics",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LongDistanceThreshold",
                table: "LocalTransportMetrics",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaseDistance",
                table: "LocalTransportMetrics");

            migrationBuilder.DropColumn(
                name: "BaseFare",
                table: "LocalTransportMetrics");

            migrationBuilder.DropColumn(
                name: "CongestionFeePerMinute",
                table: "LocalTransportMetrics");

            migrationBuilder.DropColumn(
                name: "LongDistancePricePerKm",
                table: "LocalTransportMetrics");

            migrationBuilder.DropColumn(
                name: "LongDistanceThreshold",
                table: "LocalTransportMetrics");

            migrationBuilder.RenameColumn(
                name: "PricePerKm",
                table: "LocalTransportMetrics",
                newName: "CostPerKm");
        }
    }
}
