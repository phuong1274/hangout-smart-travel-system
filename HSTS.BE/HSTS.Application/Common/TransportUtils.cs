namespace HSTS.Application.Common
{
    public static class TransportUtils
    {
        public static int CalculateTravelDuration(double distanceKm, decimal speedKmh)
        {
            if (speedKmh <= 0) return 5;
            
            var baseDurationMinutes = (distanceKm / (double)speedKmh) * 60d;
            
            return Math.Max(5, (int)Math.Round(baseDurationMinutes));
        }

        public static decimal CalculateLocalTransportCost(
            decimal baseFare,
            decimal baseDistance,
            decimal pricePerKm,
            decimal? longDistanceThreshold,
            decimal? longDistancePricePerKm,
            decimal congestionFeePerMinute,
            double distanceKm,
            int durationMinutes,
            int vehicleCount)
        {
            var distDec = (decimal)distanceKm;

            decimal tripFare = 0;

            if (distDec <= baseDistance)
            {
                tripFare = baseFare;
            }
            else
            {
                tripFare = baseFare;
                decimal remainingDist = distDec - baseDistance;

                if (longDistanceThreshold.HasValue && longDistancePricePerKm.HasValue && distDec > longDistanceThreshold.Value)
                {
                    decimal normalRateDist = longDistanceThreshold.Value - baseDistance;
                    tripFare += normalRateDist * pricePerKm;
                    decimal longRateDist = distDec - longDistanceThreshold.Value;
                    tripFare += longRateDist * longDistancePricePerKm.Value;
                }
                else
                {
                    tripFare += remainingDist * pricePerKm;
                }
            }

            var congestionFare = durationMinutes * congestionFeePerMinute;

            return (tripFare + congestionFare) * vehicleCount;
        }
    }
}
