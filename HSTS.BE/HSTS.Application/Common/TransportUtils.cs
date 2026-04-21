namespace HSTS.Application.Common
{
    public static class TransportUtils
    {
        public static bool IsPeakHour(TimeOnly time)
        {
            // Morning peak: 07:00 - 09:00
            var morningStart = new TimeOnly(7, 0);
            var morningEnd = new TimeOnly(9, 0);

            // Afternoon peak: 16:30 - 19:00
            var afternoonStart = new TimeOnly(16, 30);
            var afternoonEnd = new TimeOnly(19, 0);

            return (time >= morningStart && time <= morningEnd) ||
                   (time >= afternoonStart && time <= afternoonEnd);
        }

        public static int CalculateTravelDuration(double distanceKm, decimal speedKmh, TimeOnly departureTime, decimal peakMultiplier)
        {
            if (speedKmh <= 0) return 5;
            
            var baseDurationMinutes = (distanceKm / (double)speedKmh) * 60d;
            var isPeak = IsPeakHour(departureTime);
            
            // If peak hour, multiply duration by the peak multiplier
            var actualDuration = isPeak ? (baseDurationMinutes * (double)peakMultiplier) : baseDurationMinutes;
            
            return Math.Max(5, (int)Math.Round(actualDuration));
        }

        public static decimal CalculateLocalTransportCost(
            decimal baseFare,
            decimal baseDistance,
            decimal pricePerKm,
            decimal? longDistanceThreshold,
            decimal? longDistancePricePerKm,
            decimal congestionFeePerMinute,
            decimal peakMultiplier,
            double distanceKm,
            int durationMinutes, // Use the adjusted duration here
            TimeOnly departureTime,
            int vehicleCount)
        {
            var isPeak = IsPeakHour(departureTime);
            var multiplier = isPeak ? peakMultiplier : 1.0m;
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

            // The durationMinutes passed here is already adjusted for peak hour
            var congestionFare = durationMinutes * congestionFeePerMinute;

            // Apply multiplier to the whole fare (including increased congestion fare)
            return (tripFare + congestionFare) * multiplier * vehicleCount;
        }
    }
}
