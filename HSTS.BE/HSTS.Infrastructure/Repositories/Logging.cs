using HSTS.Infrastructure.Persistence;

namespace HSTS.Infrastructure.Repositories
{
    public class Logging : ILoggingService
    {
        private readonly AppDbContext _context;
        public Logging(AppDbContext context)
        {
            _context = context;
        }

        public Task LogActivityAsync(string logContent)
        {
            return LogActivityAsync(logContent, null, null);
        }

        public Task LogActivityAsync(string logContent, Guid? objectGuid, Guid? userId)
        {
            _context.LogActivities.Add(new LogActivity
            {
                LogContent = logContent,
                ObjectGuid = objectGuid,
                UserId = userId,
            });
            return _context.SaveChangesAsync();
        }

        public Task LogErrorAsync(string exception)
        {
            return LogErrorAsync(exception, null);
        }

        public Task LogErrorAsync(string exception, string? positionError)
        {
            return LogErrorAsync(exception, positionError, null, null);
        }

        public Task LogErrorAsync(string exception, string? positionError, Guid? objectGuid, Guid? userId)
        {
            _context.LogErrors.Add(new LogError
            {
                LogContent = exception,
                PositionError = positionError,
                ObjectGuid = objectGuid,
                UserId = userId,
            });

            return _context.SaveChangesAsync();
        }

        public Task LogHistoryAsync(string action)
        {
            throw new NotImplementedException();
        }

        public Task LogHistoryAsync(string logContent, Guid? objectGuid, Guid? userId)
        {
            _context.LogHistories.Add(new LogHistory
            {
                LogContent = logContent,
                ObjectGuid = objectGuid,
                UserId = userId,
            });
            return _context.SaveChangesAsync();
        }

        public Task LogLogin(Guid userId)
        {
            _context.LogLogins.Add(new LogLogin
            {
                UserId = userId,
                LoginAt = DateTime.UtcNow
            });
            return _context.SaveChangesAsync();
        }

        public Task LogLogout(Guid userId)
        {
            _context.LogLogins.Add(new LogLogin
            {
                UserId = userId,
                LogoutAt = DateTime.UtcNow
            });
            return _context.SaveChangesAsync();
        }
    }
}
