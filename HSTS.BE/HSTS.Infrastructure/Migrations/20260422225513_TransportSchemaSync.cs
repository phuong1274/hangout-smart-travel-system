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
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS `LocalTransportMetrics` (
                    `TransportationId` int NOT NULL,
                    `BaseFare` decimal(18,2) NOT NULL DEFAULT 0.00,
                    `BaseDistance` decimal(18,2) NOT NULL DEFAULT 0.00,
                    `PricePerKm` decimal(18,2) NOT NULL DEFAULT 0.00,
                    `LongDistanceThreshold` decimal(18,2) NULL,
                    `LongDistancePricePerKm` decimal(18,2) NULL,
                    `CongestionFeePerMinute` decimal(18,2) NOT NULL DEFAULT 0.00,
                    `SpeedKmh` decimal(18,2) NOT NULL DEFAULT 0.00,
                    `MaxRecommendedDistance` decimal(18,2) NULL,
                    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
                    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
                    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
                    CONSTRAINT `PK_LocalTransportMetrics` PRIMARY KEY (`TransportationId`)
                ) CHARACTER SET=utf8mb4;
                """);

            migrationBuilder.Sql("""
                SET @has_transport_modes_table := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'TransportModes'
                );
                SET @has_transport_fk := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND CONSTRAINT_NAME = 'FK_LocalTransportMetrics_TransportModes_TransportationId'
                );
                SET @add_transport_fk_sql := IF(
                    @has_transport_modes_table > 0 AND @has_transport_fk = 0,
                    'ALTER TABLE `LocalTransportMetrics` ADD CONSTRAINT `FK_LocalTransportMetrics_TransportModes_TransportationId` FOREIGN KEY (`TransportationId`) REFERENCES `TransportModes` (`Id`) ON DELETE CASCADE;',
                    'SELECT 1;'
                );
                PREPARE add_transport_fk_stmt FROM @add_transport_fk_sql;
                EXECUTE add_transport_fk_stmt;
                DEALLOCATE PREPARE add_transport_fk_stmt;
                """);

            migrationBuilder.Sql("""
                SET @has_cost_per_km := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'CostPerKm'
                );
                SET @has_price_per_km := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'PricePerKm'
                );
                SET @rename_cost_sql := IF(
                    @has_cost_per_km > 0 AND @has_price_per_km = 0,
                    'ALTER TABLE `LocalTransportMetrics` RENAME COLUMN `CostPerKm` TO `PricePerKm`;',
                    'SELECT 1;'
                );
                PREPARE rename_cost_stmt FROM @rename_cost_sql;
                EXECUTE rename_cost_stmt;
                DEALLOCATE PREPARE rename_cost_stmt;
                """);

            migrationBuilder.Sql("""
                SET @has_base_distance := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'BaseDistance'
                );
                SET @base_distance_sql := IF(
                    @has_base_distance = 0,
                    'ALTER TABLE `LocalTransportMetrics` ADD COLUMN `BaseDistance` decimal(18,2) NOT NULL DEFAULT 0.00;',
                    'SELECT 1;'
                );
                PREPARE add_base_distance_stmt FROM @base_distance_sql;
                EXECUTE add_base_distance_stmt;
                DEALLOCATE PREPARE add_base_distance_stmt;
                """);

            migrationBuilder.Sql("""
                SET @has_base_fare := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'BaseFare'
                );
                SET @base_fare_sql := IF(
                    @has_base_fare = 0,
                    'ALTER TABLE `LocalTransportMetrics` ADD COLUMN `BaseFare` decimal(18,2) NOT NULL DEFAULT 0.00;',
                    'SELECT 1;'
                );
                PREPARE add_base_fare_stmt FROM @base_fare_sql;
                EXECUTE add_base_fare_stmt;
                DEALLOCATE PREPARE add_base_fare_stmt;
                """);

            migrationBuilder.Sql("""
                SET @has_congestion_fee := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'CongestionFeePerMinute'
                );
                SET @congestion_fee_sql := IF(
                    @has_congestion_fee = 0,
                    'ALTER TABLE `LocalTransportMetrics` ADD COLUMN `CongestionFeePerMinute` decimal(18,2) NOT NULL DEFAULT 0.00;',
                    'SELECT 1;'
                );
                PREPARE add_congestion_fee_stmt FROM @congestion_fee_sql;
                EXECUTE add_congestion_fee_stmt;
                DEALLOCATE PREPARE add_congestion_fee_stmt;
                """);

            migrationBuilder.Sql("""
                SET @has_long_distance_price := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'LongDistancePricePerKm'
                );
                SET @long_distance_price_sql := IF(
                    @has_long_distance_price = 0,
                    'ALTER TABLE `LocalTransportMetrics` ADD COLUMN `LongDistancePricePerKm` decimal(18,2) NULL;',
                    'SELECT 1;'
                );
                PREPARE add_long_distance_price_stmt FROM @long_distance_price_sql;
                EXECUTE add_long_distance_price_stmt;
                DEALLOCATE PREPARE add_long_distance_price_stmt;
                """);

            migrationBuilder.Sql("""
                SET @has_long_distance_threshold := (
                    SELECT COUNT(*)
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'LocalTransportMetrics'
                      AND COLUMN_NAME = 'LongDistanceThreshold'
                );
                SET @long_distance_threshold_sql := IF(
                    @has_long_distance_threshold = 0,
                    'ALTER TABLE `LocalTransportMetrics` ADD COLUMN `LongDistanceThreshold` decimal(18,2) NULL;',
                    'SELECT 1;'
                );
                PREPARE add_long_distance_threshold_stmt FROM @long_distance_threshold_sql;
                EXECUTE add_long_distance_threshold_stmt;
                DEALLOCATE PREPARE add_long_distance_threshold_stmt;
                """);
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
