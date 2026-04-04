using System.Text.Json;
using System.Text.Json.Serialization;

namespace HSTS.API.JsonConverters
{
    public class TimeSpanJsonConverter : JsonConverter<TimeSpan>
    {
        public override TimeSpan Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var timeSpanStr = reader.GetString();
            if (string.IsNullOrEmpty(timeSpanStr))
                return TimeSpan.Zero;

            return TimeSpan.Parse(timeSpanStr);
        }

        public override void Write(Utf8JsonWriter writer, TimeSpan value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString(@"hh\:mm\:ss"));
        }
    }
}
