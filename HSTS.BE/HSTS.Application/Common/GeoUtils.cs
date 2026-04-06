namespace HSTS.Application.Common
{
    /// <summary>
    /// Geographic utility functions for distance calculations.
    /// </summary>
    public static class GeoUtils
    {
        private const double EarthRadiusKm = 6371.0;

        /// <summary>
        /// Calculates the distance between two geographic coordinates using the Haversine formula.
        /// Returns distance in meters.
        /// </summary>
        public static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
        {
            var dLat = ToRadians(lat2 - lat1);
            var dLng = ToRadians(lng2 - lng1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                    + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2))
                    * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return EarthRadiusKm * c * 1000.0; // Convert km to meters
        }

        /// <summary>
        /// Calculates a bounding box around a point within the given radius.
        /// Returns (minLat, maxLat, minLng, maxLng) in degrees.
        /// </summary>
        public static (double MinLat, double MaxLat, double MinLng, double MaxLng) GetBoundingBox(
            double latitude, double longitude, double radiusMeters)
        {
            var radiusKm = radiusMeters / 1000.0;
            var latRad = ToRadians(latitude);
            var lngRad = ToRadians(longitude);

            // Angular distance on Earth's surface
            var angularDist = radiusKm / EarthRadiusKm;

            var minLatRad = latRad - angularDist;
            var maxLatRad = latRad + angularDist;

            // Longitude delta depends on current latitude
            var dLng = Math.Asin(Math.Sin(angularDist) / Math.Cos(latRad));

            var minLngRad = lngRad - dLng;
            var maxLngRad = lngRad + dLng;

            return (
                ToDegrees(minLatRad),
                ToDegrees(maxLatRad),
                ToDegrees(minLngRad),
                ToDegrees(maxLngRad)
            );
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
        private static double ToDegrees(double radians) => radians * 180.0 / Math.PI;
    }
}
