using Microsoft.EntityFrameworkCore;

namespace HSTS.Application.Interfaces
{
    public interface ITransactionDbContext
    {
        Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
    }
}
