using MediatR;
using ErrorOr;
using HSTS.Application.Itineraries.Common;
using System;
using System.Collections.Generic;

namespace HSTS.Application.Itineraries.Commands;

public record CalculateSmartItineraryCommand(
    List<string> Destinations,
    double TotalBudget,
    List<string> Tags,
    DateTime StartDate,
    DateTime EndDate,
    double StartLat,
    double StartLon
) : IRequest<ErrorOr<ItineraryDto>>;
