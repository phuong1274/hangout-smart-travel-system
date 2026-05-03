using ErrorOr;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using static HSTS.Application.Interfaces.IRepository;
using System.Text;
using System.Text.RegularExpressions;

namespace HSTS.Application.Locations.Queries
{
    public record DuplicateLocationDto(
        int Id,
        string Name,
        double JaccardScore,
        double LevenshteinScore,
        double FinalScore
    );

    public record CheckDuplicateLocationQuery(string Name, double? Latitude = null, double? Longitude = null, double RadiusKm = 5.0) : IRequest<ErrorOr<List<DuplicateLocationDto>>>;

    public class CheckDuplicateLocationQueryHandler : IRequestHandler<CheckDuplicateLocationQuery, ErrorOr<List<DuplicateLocationDto>>>
    {
        private readonly IRepository<Location> _locationRepository;
        private const double JaccardThreshold = 0.3;
        private const double FinalThreshold = 0.55;
        private const int MaxCandidates = 50;

        public CheckDuplicateLocationQueryHandler(IRepository<Location> locationRepository)
        {
            _locationRepository = locationRepository;
        }

        public async Task<ErrorOr<List<DuplicateLocationDto>>> Handle(CheckDuplicateLocationQuery request, CancellationToken cancellationToken)
        {
            var inputNormalized = Normalize(request.Name);
            var inputTokens = Tokenize(inputNormalized);

            if (string.IsNullOrWhiteSpace(inputNormalized) || inputTokens.Length == 0)
            {
                return new List<DuplicateLocationDto>();
            }

            // 1. Pre-filter: candidates containing ANY token, ordered by name length similarity
            var allLocations = await _locationRepository.Query()
                .Where(l => !l.IsDeleted)
                .ToListAsync(cancellationToken);

            var inputLen = inputNormalized.Length;

            var candidates = allLocations
                .Where(l => MatchesAnyToken(l.Name, inputTokens))
                // If coordinates provided, filter by radius
                .Where(l => request.Latitude == null || request.Longitude == null
                    || HaversineDistance(l.Latitude, l.Longitude, request.Latitude.Value, request.Longitude.Value) <= request.RadiusKm)
                .OrderBy(l => Math.Abs(Normalize(l.Name).Length - inputLen)) // similar length first
                .ThenBy(l => l.Name)
                .Take(MaxCandidates)
                .ToList();

            // 2. Score each candidate
            var results = candidates
                .SelectMany(loc =>
                {
                    var nameNorm = Normalize(loc.Name);
                    var candidateTokens = Tokenize(nameNorm);

                    var jaccard = JaccardSimilarity(inputTokens, candidateTokens);
                    var leven = LevenshteinSimilarity(inputNormalized, nameNorm);
                    var finalScore = CombineScore(leven, jaccard);

                    // For short inputs (≤2 tokens), Jaccard is unreliable — let Levenshtein through
                    var passes = inputTokens.Length <= 2
                        ? (leven >= FinalThreshold)
                        : (jaccard >= JaccardThreshold && finalScore >= FinalThreshold);

                    if (!passes)
                        return Array.Empty<DuplicateLocationDto>();

                    return new[]
                    {
                        new DuplicateLocationDto(
                            loc.Id,
                            loc.Name,
                            Math.Round(jaccard, 4),
                            Math.Round(leven, 4),
                            Math.Round(finalScore, 4)
                        )
                    };
                })
                .OrderByDescending(x => x.FinalScore)
                .Take(10)
                .ToList();

            return results;
        }

        /// <summary>
        /// Normalize text: remove Vietnamese accents, lowercase, trim, collapse whitespace.
        /// </summary>
        public static string Normalize(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            // Step 1: Remove Vietnamese accents
            var normalized = input.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in normalized)
            {
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }

            var stripped = sb.ToString().Normalize(NormalizationForm.FormC);

            // Step 2: Lowercase
            var lowered = stripped.ToLowerInvariant();

            // Step 3: Replace non-alphanumeric chars (except spaces) with space
            var cleaned = Regex.Replace(lowered, @"[^a-z0-9\s]", " ");

            // Step 4: Collapse multiple spaces
            var collapsed = Regex.Replace(cleaned, @"\s+", " ").Trim();

            return collapsed;
        }

        /// <summary>
        /// Split normalized text into tokens by whitespace.
        /// </summary>
        public static string[] Tokenize(string normalized)
        {
            if (string.IsNullOrWhiteSpace(normalized))
                return Array.Empty<string>();

            return normalized.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        }

        /// <summary>
        /// Jaccard similarity: |A ∩ B| / |A ∪ B| on token sets.
        /// Handles empty sets safely.
        /// </summary>
        public static double JaccardSimilarity(string[] tokensA, string[] tokensB)
        {
            if (tokensA.Length == 0 && tokensB.Length == 0) return 1.0;
            if (tokensA.Length == 0 || tokensB.Length == 0) return 0.0;

            var setA = new HashSet<string>(tokensA, StringComparer.OrdinalIgnoreCase);
            var setB = new HashSet<string>(tokensB, StringComparer.OrdinalIgnoreCase);

            var intersection = setA.Intersect(setB, StringComparer.OrdinalIgnoreCase).Count();
            var union = setA.Union(setB, StringComparer.OrdinalIgnoreCase).Count();

            return union == 0 ? 0.0 : (double)intersection / union;
        }

        /// <summary>
        /// Levenshtein similarity: 1 - (editDistance / maxLen).
        /// Returns 1.0 for identical strings, 0.0 for completely different.
        /// Handles short strings and edge cases safely.
        /// </summary>
        public static double LevenshteinSimilarity(string a, string b)
        {
            if (a == null) a = string.Empty;
            if (b == null) b = string.Empty;
            if (a == b) return 1.0;
            if (a.Length == 0 || b.Length == 0) return 0.0;

            var distance = ComputeLevenshtein(a, b);
            var maxLen = Math.Max(a.Length, b.Length);

            return maxLen == 0 ? 0.0 : 1.0 - (double)distance / maxLen;
        }

        /// <summary>
        /// Classic Levenshtein edit distance (O(n*m) space).
        /// </summary>
        private static int ComputeLevenshtein(string source, string target)
        {
            var n = source.Length;
            var m = target.Length;

            if (n == 0) return m;
            if (m == 0) return n;

            var matrix = new int[n + 1, m + 1];

            // Initialize first column
            for (var i = 0; i <= n; i++)
                matrix[i, 0] = i;

            // Initialize first row
            for (var j = 0; j <= m; j++)
                matrix[0, j] = j;

            // Fill matrix
            for (var i = 1; i <= n; i++)
            {
                for (var j = 1; j <= m; j++)
                {
                    var cost = (source[i - 1] == target[j - 1]) ? 0 : 1;
                    matrix[i, j] = Math.Min(
                        Math.Min(
                            matrix[i - 1, j] + 1,      // deletion
                            matrix[i, j - 1] + 1),     // insertion
                        matrix[i - 1, j - 1] + cost);   // substitution
                }
            }

            return matrix[n, m];
        }

        /// <summary>
        /// Haversine formula: distance in km between two lat/lng points.
        /// </summary>
        private static double HaversineDistance(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371.0; // Earth's radius in km

            var dLat = ToRadians(lat2 - lat1);
            var dLng = ToRadians(lng2 - lng1);

            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                    Math.Sin(dLng / 2) * Math.Sin(dLng / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

            return R * c;
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

        /// <summary>
        /// Combine scores: 0.6 * Levenshtein + 0.4 * Jaccard.
        /// Levenshtein weighted higher because it catches typos and character-level diffs
        /// that token-based Jaccard misses.
        /// </summary>
        public static double CombineScore(double levenshteinScore, double jaccardScore)
        {
            return 0.6 * levenshteinScore + 0.4 * jaccardScore;
        }

        /// <summary>
        /// Check if a location name contains ANY of the input tokens (case-insensitive).
        /// Used for SQL pre-filtering.
        /// </summary>
        private static bool MatchesAnyToken(string locationName, string[] inputTokens)
        {
            var normalized = Normalize(locationName);
            return inputTokens.Any(t => normalized.Contains(t, StringComparison.OrdinalIgnoreCase));
        }
    }
}
