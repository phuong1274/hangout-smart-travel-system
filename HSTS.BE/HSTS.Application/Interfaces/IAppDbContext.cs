using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Interfaces
{
    public interface IAppDbContext : ITransactionDbContext
    {
        DbSet<Account> Accounts { get; }
        DbSet<User> Users { get; }
        DbSet<Profile> Profiles { get; }
        DbSet<Role> Roles { get; }
        DbSet<UserRole> UserRoles { get; }
        DbSet<Otp> Otps { get; }
        DbSet<PasswordSetupToken> PasswordSetupTokens { get; }
        DbSet<AccountRefreshToken> AccountRefreshTokens { get; }
        DbSet<TransportMode> TransportModes { get; }
        DbSet<LocalTransportMetrics> LocalTransportMetrics { get; }
        DbSet<TransitHubType> TransitHubTypes { get; }
        DbSet<TransitHubs> TransitHubs { get; }
        DbSet<Province> Provinces { get; }
        DbSet<District> Districts { get; }
        DbSet<Country> Countries { get; }
        DbSet<LocationType> LocationTypes { get; }
        DbSet<Location> Locations { get; }
        DbSet<LocationReview> LocationReviews { get; }
        DbSet<LocationReviewReport> LocationReviewReports { get; }
        DbSet<LocationSocialLink> LocationSocialLinks { get; }
        DbSet<LocationMedia> LocationMedias { get; }
        DbSet<LocationTag> LocationTags { get; }
        DbSet<Tag> Tags { get; }
        DbSet<Amenity> Amenities { get; }
        DbSet<LocationAmenity> LocationAmenities { get; }
        DbSet<LocationOpeningHour> LocationOpeningHours { get; }
        DbSet<LocationClosure> LocationClosures { get; }
        DbSet<LocationSubmission> LocationSubmissions { get; }
        DbSet<LocationSeason> LocationSeasons { get; }
        DbSet<Trip> Trips { get; }
        DbSet<TripDay> TripDays { get; }
        DbSet<TripActivity> TripActivities { get; }
        DbSet<TripTransport> TripTransports { get; }
        DbSet<TripSummary> TripSummaries { get; }
        DbSet<TripActivityBudget> TripActivityBudgets { get; }

        DbSet<TripInvitation> TripInvitations { get; }
        DbSet<TripMember> TripMembers { get; }
        DbSet<Expense> Expenses { get; }
        DbSet<CustomLocation> CustomLocations { get; }
        DbSet<CustomTransitHub> CustomTransitHubs { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
