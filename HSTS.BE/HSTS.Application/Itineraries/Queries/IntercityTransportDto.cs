using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record IntercityTransportDto(
        int FromProvinceId,
        string FromProvinceName,
        int ToProvinceId,
        string ToProvinceName,
        double DistanceKm,
        string? SelectedMethod,
        int SelectedTravelTimeMinutes,
        MoneyDto SelectedTotalCost,
        IList<TransportOptionDto> TransportOptions,
        string? Warning = null);
}
