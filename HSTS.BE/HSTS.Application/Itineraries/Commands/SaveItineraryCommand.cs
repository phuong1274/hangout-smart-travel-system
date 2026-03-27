using MediatR;
using ErrorOr;
using HSTS.Application.Interfaces;
using HSTS.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace HSTS.Application.Itineraries.Commands;

public record SaveItineraryCommand(
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    double TotalBudget,
    double ActualCost,
    string? Notes,
    List<SaveItineraryItemDto> Items
) : IRequest<ErrorOr<int>>;

public record SaveItineraryItemDto(
    int? LocationId,
    string Title,
    string? Description,
    DateTime ArrivalTime,
    DateTime DepartureTime,
    double Cost,
    bool IsTransport
);

public class SaveItineraryCommandHandler : IRequestHandler<SaveItineraryCommand, ErrorOr<int>>
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SaveItineraryCommandHandler(IAppDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ErrorOr<int>> Handle(SaveItineraryCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        if (currentUserId == 0)
            return Error.Unauthorized("Auth.Unauthorized", "User is not authenticated.");

        var itinerary = new Itinerary
        {
            UserId = currentUserId,
            Name = request.Name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            TotalBudget = request.TotalBudget,
            ActualCost = request.ActualCost,
            Notes = request.Notes,
            ItineraryItems = request.Items.Select(item => new ItineraryItem
            {
                LocationId = item.LocationId,
                Title = item.Title,
                Description = item.Description,
                ArrivalTime = item.ArrivalTime,
                DepartureTime = item.DepartureTime,
                Cost = item.Cost,
                IsTransport = item.IsTransport
            }).ToList()
        };

        _context.Itineraries.Add(itinerary);
        await _context.SaveChangesAsync(cancellationToken);

        return itinerary.Id;
    }
}
