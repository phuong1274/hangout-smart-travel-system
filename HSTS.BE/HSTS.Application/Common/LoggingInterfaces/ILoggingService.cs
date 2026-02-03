namespace SEP490.Application.Common.LoggingInterfaces
{
    public interface ILoggingService
    {
        Task LogActivityAsync(string logContent);
        Task LogActivityAsync(string logContent, Guid? objectGuid, Guid? userId);

        Task LogErrorAsync(string exception);
        Task LogErrorAsync(string exception, string positionError);
        Task LogErrorAsync(string exception, string positionError, Guid? objectGuid, Guid? userId);

        Task LogHistoryAsync(string action);
        Task LogHistoryAsync(string action, Guid? objectGuid, Guid? userId);

        Task LogLogin(Guid userId);
        Task LogLogout(Guid userId);
    }
}
