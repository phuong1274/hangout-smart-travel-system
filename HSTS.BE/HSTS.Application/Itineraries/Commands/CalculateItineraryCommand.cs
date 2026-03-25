using MediatR;
using HSTS.Application.Itineraries.Common;
using System;
using System.Collections.Generic;

namespace HSTS.Application.Itineraries.Commands
{
    public class CalculateItineraryCommand : IRequest<ItineraryDto>
    {
        public double TotalBudget { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<string> Preferences { get; set; } = new();
        public double StartLat { get; set; }
        public double StartLon { get; set; }
    }
}
