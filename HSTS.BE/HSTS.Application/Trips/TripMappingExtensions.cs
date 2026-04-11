using HSTS.Domain.Entities;

namespace HSTS.Application.Trips
{
    public static class TripMappingExtensions
    {
        public static TripDto ToDto(this Trip trip)
        {
            return new TripDto(
                trip.Id,
                trip.TripName,
                trip.Description,
                trip.StartDate,
                trip.EndDate,
                trip.StartingLocation,
                trip.Status,
                trip.Currency,
                trip.CreatedAt
            );
        }
    }
}
