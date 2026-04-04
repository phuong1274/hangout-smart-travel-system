using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Queries
{
    public record AccommodationRecommendationDto(
         int LocationId,
         string LocationName,
         string Address,
         double Score,
         MoneyDto PricePerPersonPerNight,
         MoneyDto TotalCostPerNight,
         double DistanceToCenter,
         int AmenityCount,
         IList<int> AmenityIds,
         bool IsRecommended);
}
