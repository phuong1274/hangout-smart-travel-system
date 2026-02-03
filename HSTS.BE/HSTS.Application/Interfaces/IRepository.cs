using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Interfaces
{
    public interface IRepository
    {
        public interface IRepository<T> where T : class
        {
            Task<T?> GetAsync(int id, CancellationToken cancellationToken = default);
            Task AddAsync(T entity, CancellationToken cancellationToken = default);
            Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
            Task DeleteAsync(T entity, CancellationToken cancellationToken = default);
            IQueryable<T> Query();

            Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
                int pageIndex,
                int pageSize,
                IQueryable<T>? query = null,
                CancellationToken cancellationToken = default);
        }
    }
}
