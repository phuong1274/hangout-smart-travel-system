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
         decimal LocationScore,
         MoneyDto PricePerPersonPerNight,
         MoneyDto TotalCostPerNight,
         double DistanceToCenter,
         IList<string> Amenities,
         string? Telephone,
         IList<string> MediaUrls,
         bool IsRecommended);
}
