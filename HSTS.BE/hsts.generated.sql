CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;
ALTER DATABASE CHARACTER SET utf8mb4;

CREATE TABLE `Accounts` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `PasswordHash` varchar(255) CHARACTER SET utf8mb4 NULL,
    `GoogleId` varchar(255) CHARACTER SET utf8mb4 NULL,
    `Status` int NOT NULL DEFAULT 0,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Accounts` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Amenities` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Amenities` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Countries` (
    `Id` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Code` varchar(10) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Countries` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationTypes` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(200) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationTypes` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `LogActivity` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `LogContent` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `ObjectGuid` char(36) COLLATE ascii_general_ci NULL,
    `UserId` char(36) COLLATE ascii_general_ci NULL,
    CONSTRAINT `PK_LogActivity` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `LogError` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `LogContent` longtext CHARACTER SET utf8mb4 NOT NULL,
    `PositionError` longtext CHARACTER SET utf8mb4 NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `ObjectGuid` char(36) COLLATE ascii_general_ci NULL,
    `UserId` char(36) COLLATE ascii_general_ci NULL,
    CONSTRAINT `PK_LogError` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `LogHistory` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `LogContent` longtext CHARACTER SET utf8mb4 NOT NULL,
    `UpdateAt` datetime(6) NOT NULL,
    `ObjectGuid` char(36) COLLATE ascii_general_ci NULL,
    `UserId` char(36) COLLATE ascii_general_ci NULL,
    CONSTRAINT `PK_LogHistory` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `LogLogin` (
    `Id` bigint NOT NULL AUTO_INCREMENT,
    `UserId` char(36) COLLATE ascii_general_ci NOT NULL,
    `LoginAt` datetime(6) NOT NULL,
    `LogoutAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_LogLogin` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Otps` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Email` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `Code` varchar(6) CHARACTER SET utf8mb4 NOT NULL,
    `Type` int NOT NULL,
    `ExpiredAt` datetime(6) NOT NULL,
    `IsUsed` tinyint(1) NOT NULL DEFAULT FALSE,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Otps` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `Roles` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `IsActive` tinyint(1) NOT NULL DEFAULT TRUE,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Roles` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `TransitHubTypes` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_TransitHubTypes` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `TransportModes` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Category` int NOT NULL,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Capacity` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_TransportModes` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `AccountRefreshTokens` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `AccountId` int NOT NULL,
    `Token` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `ExpiredAt` datetime(6) NOT NULL,
    `RevokedAt` datetime(6) NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_AccountRefreshTokens` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_AccountRefreshTokens_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Users` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `AccountId` int NOT NULL,
    `FullName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `DateOfBirth` datetime(6) NULL,
    `Gender` int NULL,
    `PhoneNumber` varchar(15) CHARACTER SET utf8mb4 NULL,
    `AvatarUrl` longtext CHARACTER SET utf8mb4 NULL,
    `Bio` longtext CHARACTER SET utf8mb4 NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Users` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Users_Accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `Accounts` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Provinces` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `EnglishName` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Code` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Latitude` double NULL,
    `Longitude` double NULL,
    `CountryId` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Provinces` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Provinces_Countries_CountryId` FOREIGN KEY (`CountryId`) REFERENCES `Countries` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocalTransportMetrics` (
    `TransportationId` int NOT NULL,
    `CostPerKm` decimal(18,2) NOT NULL,
    `SpeedKmh` decimal(18,2) NOT NULL,
    `MaxRecommendedDistance` decimal(18,2) NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocalTransportMetrics` PRIMARY KEY (`TransportationId`),
    CONSTRAINT `FK_LocalTransportMetrics_TransportModes_TransportationId` FOREIGN KEY (`TransportationId`) REFERENCES `TransportModes` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Profiles` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `UserId` int NOT NULL,
    `ProfileName` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `Address` varchar(500) CHARACTER SET utf8mb4 NULL,
    `AvatarUrl` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Profiles` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Profiles_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `UserRoles` (
    `UserId` int NOT NULL,
    `RoleId` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_UserRoles` PRIMARY KEY (`UserId`, `RoleId`),
    CONSTRAINT `FK_UserRoles_Roles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_UserRoles_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Districts` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `EnglishName` varchar(200) CHARACTER SET utf8mb4 NULL,
    `Latitude` double NULL,
    `Longitude` double NULL,
    `ProvinceId` int NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Districts` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Districts_Provinces_ProvinceId` FOREIGN KEY (`ProvinceId`) REFERENCES `Provinces` (`Id`) ON DELETE SET NULL
) CHARACTER SET=utf8mb4;

CREATE TABLE `Locations` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Description` varchar(2000) CHARACTER SET utf8mb4 NULL,
    `Latitude` double NOT NULL,
    `Longitude` double NOT NULL,
    `TicketPrice` decimal(18,2) NOT NULL,
    `MinimumAge` int NOT NULL,
    `Address` varchar(300) CHARACTER SET utf8mb4 NOT NULL,
    `Telephone` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Email` varchar(200) CHARACTER SET utf8mb4 NULL,
    `DistrictId` int NOT NULL,
    `LocationTypeId` int NULL,
    `SourceUrl` longtext CHARACTER SET utf8mb4 NULL,
    `PriceMinUsd` decimal(18,2) NULL,
    `PriceMaxUsd` decimal(18,2) NULL,
    `RecommendedDurationMinutes` int NULL,
    `Score` decimal(65,30) NULL,
    `OwnerId` int NULL,
    `Status` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Locations` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Locations_Districts_DistrictId` FOREIGN KEY (`DistrictId`) REFERENCES `Districts` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_Locations_LocationTypes_LocationTypeId` FOREIGN KEY (`LocationTypeId`) REFERENCES `LocationTypes` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_Locations_Users_OwnerId` FOREIGN KEY (`OwnerId`) REFERENCES `Users` (`Id`)
) CHARACTER SET=utf8mb4;

CREATE TABLE `TransitHubs` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `DistrictId` int NOT NULL,
    `TransportationId` int NOT NULL,
    `TransitHubTypeId` int NOT NULL,
    `Code` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
    `Name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Longitude` double NOT NULL,
    `Latitude` double NOT NULL,
    `ProvinceId` int NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_TransitHubs` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_TransitHubs_Districts_DistrictId` FOREIGN KEY (`DistrictId`) REFERENCES `Districts` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TransitHubs_Provinces_ProvinceId` FOREIGN KEY (`ProvinceId`) REFERENCES `Provinces` (`Id`),
    CONSTRAINT `FK_TransitHubs_TransitHubTypes_TransitHubTypeId` FOREIGN KEY (`TransitHubTypeId`) REFERENCES `TransitHubTypes` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TransitHubs_TransportModes_TransportationId` FOREIGN KEY (`TransportationId`) REFERENCES `TransportModes` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationAmenities` (
    `LocationId` int NOT NULL,
    `AmenityId` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationAmenities` PRIMARY KEY (`LocationId`, `AmenityId`),
    CONSTRAINT `FK_LocationAmenities_Amenities_AmenityId` FOREIGN KEY (`AmenityId`) REFERENCES `Amenities` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_LocationAmenities_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationClosures` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `LocationId` int NOT NULL,
    `StartDate` datetime(6) NOT NULL,
    `EndDate` datetime(6) NOT NULL,
    `Reason` varchar(500) CHARACTER SET utf8mb4 NULL,
    `IsActive` tinyint(1) NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationClosures` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_LocationClosures_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationMedias` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Link` varchar(2000) CHARACTER SET utf8mb4 NOT NULL,
    `LocationId` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationMedias` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_LocationMedias_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationOpeningHours` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `LocationId` int NOT NULL,
    `DayOfWeek` int NOT NULL,
    `OpenTime` time(6) NULL,
    `CloseTime` time(6) NULL,
    `Note` varchar(500) CHARACTER SET utf8mb4 NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationOpeningHours` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_LocationOpeningHours_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationSeasons` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `LocationId` int NOT NULL,
    `Description` varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
    `Months` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationSeasons` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_LocationSeasons_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationSocialLinks` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Platform` int NOT NULL,
    `Url` varchar(500) CHARACTER SET utf8mb4 NOT NULL,
    `LocationId` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationSocialLinks` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_LocationSocialLinks_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationSubmissions` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `UserId` int NOT NULL,
    `Name` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
    `Description` text CHARACTER SET utf8mb4 NULL,
    `Latitude` double NOT NULL,
    `Longitude` double NOT NULL,
    `Address` varchar(300) CHARACTER SET utf8mb4 NOT NULL,
    `Telephone` varchar(50) CHARACTER SET utf8mb4 NULL,
    `Email` varchar(200) CHARACTER SET utf8mb4 NULL,
    `PriceMinUsd` decimal(18,2) NULL,
    `PriceMaxUsd` decimal(18,2) NULL,
    `Score` decimal(65,30) NULL,
    `DistrictId` int NULL,
    `LocationTypeId` int NULL,
    `MediaLinksJson` text CHARACTER SET utf8mb4 NULL,
    `SocialLinksJson` text CHARACTER SET utf8mb4 NULL,
    `AmenityIdsJson` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `TagIdsJson` varchar(1000) CHARACTER SET utf8mb4 NULL,
    `OpeningHoursJson` varchar(4000) CHARACTER SET utf8mb4 NULL,
    `SeasonsJson` varchar(250) CHARACTER SET utf8mb4 NULL,
    `ProposedChangesJson` varchar(4000) CHARACTER SET utf8mb4 NULL,
    `Status` int NOT NULL,
    `RejectionReason` varchar(500) CHARACTER SET utf8mb4 NULL,
    `ReviewedAt` datetime(6) NULL,
    `ReviewedBy` varchar(450) CHARACTER SET utf8mb4 NULL,
    `ExistingLocationId` int NULL,
    `CreatedLocationId` int NULL,
    `SubmissionType` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationSubmissions` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_LocationSubmissions_Districts_DistrictId` FOREIGN KEY (`DistrictId`) REFERENCES `Districts` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_LocationSubmissions_LocationTypes_LocationTypeId` FOREIGN KEY (`LocationTypeId`) REFERENCES `LocationTypes` (`Id`),
    CONSTRAINT `FK_LocationSubmissions_Locations_CreatedLocationId` FOREIGN KEY (`CreatedLocationId`) REFERENCES `Locations` (`Id`) ON DELETE SET NULL,
    CONSTRAINT `FK_LocationSubmissions_Locations_ExistingLocationId` FOREIGN KEY (`ExistingLocationId`) REFERENCES `Locations` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_LocationSubmissions_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

CREATE TABLE `Tags` (
    `Id` int NOT NULL AUTO_INCREMENT,
    `Name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
    `ParentTagId` int NULL,
    `Level` int NOT NULL DEFAULT 1,
    `LocationId` int NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_Tags` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Tags_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`),
    CONSTRAINT `FK_Tags_Tags_ParentTagId` FOREIGN KEY (`ParentTagId`) REFERENCES `Tags` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

CREATE TABLE `LocationTags` (
    `LocationId` int NOT NULL,
    `TagId` int NOT NULL,
    `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `CreatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `UpdatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(),
    `UpdatedBy` longtext CHARACTER SET utf8mb4 NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT FALSE,
    CONSTRAINT `PK_LocationTags` PRIMARY KEY (`LocationId`, `TagId`),
    CONSTRAINT `FK_LocationTags_Locations_LocationId` FOREIGN KEY (`LocationId`) REFERENCES `Locations` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_LocationTags_Tags_TagId` FOREIGN KEY (`TagId`) REFERENCES `Tags` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

INSERT INTO `LocationTypes` (`Id`, `CreatedBy`, `Description`, `Name`, `UpdatedBy`)
VALUES (1, NULL, 'Tourist attractions and points of interest', 'Attraction', NULL),
(2, NULL, 'Dining establishments and food venues', 'Restaurant', NULL),
(3, NULL, 'Hotels, resorts, and lodging options', 'Accommodation', NULL),
(4, NULL, 'Shopping centers, markets, and retail stores', 'Shopping', NULL),
(5, NULL, 'Travel agencies and transportation services', 'TravelService', NULL);

INSERT INTO `Roles` (`Id`, `CreatedBy`, `IsActive`, `Name`, `UpdatedBy`)
VALUES (1, NULL, TRUE, 'ADMIN', NULL),
(2, NULL, TRUE, 'CONTENT_MODERATOR', NULL),
(3, NULL, TRUE, 'PARTNER', NULL),
(4, NULL, TRUE, 'TRAVELER', NULL);

CREATE INDEX `IX_AccountRefreshTokens_AccountId` ON `AccountRefreshTokens` (`AccountId`);

CREATE UNIQUE INDEX `IX_AccountRefreshTokens_Token` ON `AccountRefreshTokens` (`Token`);

CREATE UNIQUE INDEX `IX_Accounts_Email` ON `Accounts` (`Email`);

CREATE UNIQUE INDEX `IX_Accounts_GoogleId` ON `Accounts` (`GoogleId`);

CREATE INDEX `IX_Districts_ProvinceId` ON `Districts` (`ProvinceId`);

CREATE INDEX `IX_LocationAmenities_AmenityId` ON `LocationAmenities` (`AmenityId`);

CREATE INDEX `IX_LocationClosures_LocationId_IsActive_StartDate_EndDate` ON `LocationClosures` (`LocationId`, `IsActive`, `StartDate`, `EndDate`);

CREATE INDEX `IX_LocationMedias_LocationId` ON `LocationMedias` (`LocationId`);

CREATE INDEX `IX_LocationOpeningHours_LocationId_DayOfWeek` ON `LocationOpeningHours` (`LocationId`, `DayOfWeek`);

CREATE INDEX `IX_Locations_DistrictId` ON `Locations` (`DistrictId`);

CREATE INDEX `IX_Locations_LocationTypeId` ON `Locations` (`LocationTypeId`);

CREATE INDEX `IX_Locations_OwnerId` ON `Locations` (`OwnerId`);

CREATE INDEX `IX_Locations_Status` ON `Locations` (`Status`);

CREATE INDEX `IX_LocationSeasons_LocationId` ON `LocationSeasons` (`LocationId`);

CREATE INDEX `IX_LocationSocialLinks_LocationId` ON `LocationSocialLinks` (`LocationId`);

CREATE INDEX `IX_LocationSubmissions_CreatedLocationId` ON `LocationSubmissions` (`CreatedLocationId`);

CREATE INDEX `IX_LocationSubmissions_DistrictId` ON `LocationSubmissions` (`DistrictId`);

CREATE INDEX `IX_LocationSubmissions_ExistingLocationId` ON `LocationSubmissions` (`ExistingLocationId`);

CREATE INDEX `IX_LocationSubmissions_LocationTypeId` ON `LocationSubmissions` (`LocationTypeId`);

CREATE INDEX `IX_LocationSubmissions_UserId` ON `LocationSubmissions` (`UserId`);

CREATE INDEX `IX_LocationTags_TagId` ON `LocationTags` (`TagId`);

CREATE INDEX `IX_Otps_Email` ON `Otps` (`Email`);

CREATE INDEX `IX_Profiles_UserId` ON `Profiles` (`UserId`);

CREATE INDEX `IX_Provinces_CountryId` ON `Provinces` (`CountryId`);

CREATE UNIQUE INDEX `IX_Roles_Name` ON `Roles` (`Name`);

CREATE INDEX `IX_Tags_LocationId` ON `Tags` (`LocationId`);

CREATE INDEX `IX_Tags_ParentTagId` ON `Tags` (`ParentTagId`);

CREATE UNIQUE INDEX `IX_TransitHubs_Code` ON `TransitHubs` (`Code`);

CREATE INDEX `IX_TransitHubs_DistrictId` ON `TransitHubs` (`DistrictId`);

CREATE INDEX `IX_TransitHubs_ProvinceId` ON `TransitHubs` (`ProvinceId`);

CREATE INDEX `IX_TransitHubs_TransitHubTypeId` ON `TransitHubs` (`TransitHubTypeId`);

CREATE INDEX `IX_TransitHubs_TransportationId` ON `TransitHubs` (`TransportationId`);

CREATE INDEX `IX_UserRoles_RoleId` ON `UserRoles` (`RoleId`);

CREATE UNIQUE INDEX `IX_Users_AccountId` ON `Users` (`AccountId`);

INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES ('20260404102945_InitialCreate', '9.0.0');

COMMIT;

