using HSTS.Domain.Entities;
using HSTS.Domain.Enums;

namespace HSTS.Tests.Helpers;

public static class AuthFakes
{
    public static Account ActiveAccount(string email = "user@test.com", string passwordHash = "hashed") =>
        new() { Id = 1, Email = email, PasswordHash = passwordHash, Status = AccountStatus.Active };

    public static Account PendingAccount(string email = "user@test.com") =>
        new() { Id = 1, Email = email, PasswordHash = "hashed", Status = AccountStatus.PendingVerification };

    public static Account BannedAccount(string email = "user@test.com") =>
        new() { Id = 1, Email = email, PasswordHash = "hashed", Status = AccountStatus.Banned };

    public static Account GoogleAccount(string email = "user@test.com", string googleId = "g-123") =>
        new() { Id = 1, Email = email, PasswordHash = null, GoogleId = googleId, Status = AccountStatus.Active };

    public static User UserFor(Account account, string fullName = "Test User") =>
        new() { Id = 1, AccountId = account.Id, FullName = fullName, Account = account, UserRoles = new List<UserRole>() };

    public static User UserWithRole(Account account, Role role, string fullName = "Test User")
    {
        var userRole = new UserRole { UserId = 1, RoleId = role.Id, Role = role };
        return new()
        {
            Id = 1, AccountId = account.Id, FullName = fullName, Account = account,
            UserRoles = new List<UserRole> { userRole }
        };
    }

    public static Role TravelerRole() => new() { Id = 1, Name = "TRAVELER" };

    public static Otp ValidOtp(string email, OtpType type) =>
        new() { Id = 1, Email = email, Code = "123456", Type = type, IsUsed = false, ExpiredAt = DateTime.UtcNow.AddMinutes(5) };

    public static Otp ExpiredOtp(string email, OtpType type) =>
        new() { Id = 1, Email = email, Code = "123456", Type = type, IsUsed = false, ExpiredAt = DateTime.UtcNow.AddMinutes(-1) };

    public static Otp UsedOtp(string email, OtpType type) =>
        new() { Id = 1, Email = email, Code = "123456", Type = type, IsUsed = true, ExpiredAt = DateTime.UtcNow.AddMinutes(5) };

    public static AccountRefreshToken ActiveRefreshToken(int accountId, string token = "valid-token") =>
        new() { Id = 1, AccountId = accountId, Token = token, ExpiredAt = DateTime.UtcNow.AddDays(7), RevokedAt = null };

    public static AccountRefreshToken ExpiredRefreshToken(int accountId, string token = "expired-token") =>
        new() { Id = 1, AccountId = accountId, Token = token, ExpiredAt = DateTime.UtcNow.AddDays(-1), RevokedAt = null };
}
