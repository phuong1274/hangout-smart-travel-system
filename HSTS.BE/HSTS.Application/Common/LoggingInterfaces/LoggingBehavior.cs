using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HSTS.Application.Common.LoggingInterfaces
{
    public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
    {
        private readonly ILoggingService _loggingService;

        public LoggingBehavior(ILoggingService loggingService)
        {
            _loggingService = loggingService;
        }

        public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
        {
            var requestName = typeof(TRequest).Name;
            var requestData = JsonSerializer.Serialize(request);

            try
            {
                // 1. Log Activity before processing 
                try { await _loggingService.LogActivityAsync($"Request start: {requestName}. Data: {requestData}"); }
                catch { /* logging should not break the request pipeline */ }

                var response = await next();

                // 2. Log Activity after processing
                try { await _loggingService.LogActivityAsync($"Finish {requestName}"); }
                catch { /* logging should not break the request pipeline */ }

                return response;
            }
            catch (Exception ex)
            {
                // 3. Automatic Error Logging
                try { await _loggingService.LogErrorAsync(ex.Message + " : " + ex.StackTrace, requestName); }
                catch { /* logging should not break the request pipeline */ }
                throw;
            }
        }
    }
}
