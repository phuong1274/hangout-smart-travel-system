using System;
using System.Collections.Generic;

namespace HSTS.Domain.Entities
{
    public class Destination : BaseEntity
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public ICollection<Location> Locations { get; set; } = new List<Location>();
    }
}
