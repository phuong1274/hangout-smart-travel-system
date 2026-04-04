using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record MoneyDto(
        decimal Amount,
        string Currency,
        decimal BaseAmount,
        string BaseCurrency);
}
