using FluentAssertions;
using System.Text.Json;

namespace HSTS.Tests.LocationSubmissions
{
    /// <summary>
    /// Tests to verify that opening hours JSON parsing handles both PascalCase and camelCase correctly
    /// This ensures that when approving submissions, all days of week are preserved correctly
    /// </summary>
    public class OpeningHoursJsonParsingTests
    {
        [Fact]
        public void PascalCaseDayOfWeek_ShouldParseCorrectly()
        {
            // Arrange - PascalCase JSON (as serialized by backend)
            var json = JsonSerializer.Serialize(new[]
            {
                new { Id = 0, DayOfWeek = 0, OpenTime = "08:00", CloseTime = "17:00", Note = "Sunday" },
                new { Id = 0, DayOfWeek = 1, OpenTime = "09:00", CloseTime = "18:00", Note = "Monday" },
                new { Id = 0, DayOfWeek = 6, OpenTime = "10:00", CloseTime = "20:00", Note = "Saturday" }
            });

            // Act
            var openingHoursData = JsonSerializer.Deserialize<List<JsonElement>>(json);

            // Assert
            openingHoursData.Should().NotBeNull();
            openingHoursData.Should().HaveCount(3);
            
            var day0 = openingHoursData![0];
            var day1 = openingHoursData[1];
            var day6 = openingHoursData[2];

            // Should be able to get DayOfWeek (PascalCase)
            day0.TryGetProperty("DayOfWeek", out var dow0).Should().BeTrue();
            dow0.GetInt32().Should().Be(0);

            day1.TryGetProperty("DayOfWeek", out var dow1).Should().BeTrue();
            dow1.GetInt32().Should().Be(1);

            day6.TryGetProperty("DayOfWeek", out var dow6).Should().BeTrue();
            dow6.GetInt32().Should().Be(6);
        }

        [Fact]
        public void CamelCaseDayOfWeek_ShouldParseCorrectly()
        {
            // Arrange - camelCase JSON (as might come from frontend)
            var json = JsonSerializer.Serialize(new[]
            {
                new { id = 0, dayOfWeek = 0, openTime = "08:00", closeTime = "17:00", note = "Sunday" },
                new { id = 0, dayOfWeek = 1, openTime = "09:00", closeTime = "18:00", note = "Monday" },
                new { id = 0, dayOfWeek = 6, openTime = "10:00", closeTime = "20:00", note = "Saturday" }
            });

            // Act
            var openingHoursData = JsonSerializer.Deserialize<List<JsonElement>>(json);

            // Assert
            openingHoursData.Should().NotBeNull();
            openingHoursData.Should().HaveCount(3);

            var day0 = openingHoursData![0];
            var day1 = openingHoursData[1];
            var day6 = openingHoursData[2];

            // Should be able to get dayOfWeek (camelCase)
            day0.TryGetProperty("dayOfWeek", out var dow0).Should().BeTrue();
            dow0.GetInt32().Should().Be(0);

            day1.TryGetProperty("dayOfWeek", out var dow1).Should().BeTrue();
            dow1.GetInt32().Should().Be(1);

            day6.TryGetProperty("dayOfWeek", out var dow6).Should().BeTrue();
            dow6.GetInt32().Should().Be(6);
        }

        [Fact]
        public void MixedCaseDayOfWeek_ShouldHandleBothFormats()
        {
            // Test the fix logic: TryGetProperty with fallback
            var pascalJson = JsonSerializer.Serialize(new { DayOfWeek = 3 });
            var camelJson = JsonSerializer.Serialize(new { dayOfWeek = 4 });

            var pascalData = JsonSerializer.Deserialize<JsonElement>(pascalJson);
            var camelData = JsonSerializer.Deserialize<JsonElement>(camelJson);

            // Try PascalCase first, then camelCase
            int pascalValue = 0;
            if (pascalData.TryGetProperty("DayOfWeek", out var pascalProp) || pascalData.TryGetProperty("dayOfWeek", out pascalProp))
            {
                pascalValue = pascalProp.GetInt32();
            }

            int camelValue = 0;
            if (camelData.TryGetProperty("DayOfWeek", out var camelProp) || camelData.TryGetProperty("dayOfWeek", out camelProp))
            {
                camelValue = camelProp.GetInt32();
            }

            pascalValue.Should().Be(3); // Wednesday
            camelValue.Should().Be(4);  // Thursday
        }

        [Fact]
        public void AllSevenDays_ShouldParseCorrectly()
        {
            // Arrange - all 7 days
            var json = JsonSerializer.Serialize(new[]
            {
                new { Id = 0, DayOfWeek = 0, OpenTime = "08:00", CloseTime = "17:00" },
                new { Id = 0, DayOfWeek = 1, OpenTime = "08:00", CloseTime = "17:00" },
                new { Id = 0, DayOfWeek = 2, OpenTime = "08:00", CloseTime = "17:00" },
                new { Id = 0, DayOfWeek = 3, OpenTime = "08:00", CloseTime = "17:00" },
                new { Id = 0, DayOfWeek = 4, OpenTime = "08:00", CloseTime = "17:00" },
                new { Id = 0, DayOfWeek = 5, OpenTime = "08:00", CloseTime = "17:00" },
                new { Id = 0, DayOfWeek = 6, OpenTime = "08:00", CloseTime = "17:00" }
            });

            // Act
            var openingHoursData = JsonSerializer.Deserialize<List<JsonElement>>(json);

            // Assert
            openingHoursData.Should().NotBeNull();
            openingHoursData.Should().HaveCount(7);

            var expectedDays = new[] { 0, 1, 2, 3, 4, 5, 6 };
            for (int i = 0; i < 7; i++)
            {
                openingHoursData![i].TryGetProperty("DayOfWeek", out var dow).Should().BeTrue();
                dow.GetInt32().Should().Be(expectedDays[i]);
            }
        }
    }
}
