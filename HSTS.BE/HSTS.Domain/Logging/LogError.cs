using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;

namespace SEP490.Domain.Logging
{
    public class LogError
    {
        public long Id { get; set; }
        public string LogContent { get; set; } = null!;
        public string? PositionError { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Guid? ObjectGuid { get; set; }
        public Guid? UserId { get; set; }
    }
}
