using FluentValidation;

namespace HSTS.Application.Itineraries.Commands;

public class CalculateSmartItineraryCommandValidator : AbstractValidator<CalculateSmartItineraryCommand>
{
    public CalculateSmartItineraryCommandValidator()
    {
        RuleFor(x => x.StartDate).NotEmpty().LessThanOrEqualTo(x => x.EndDate);
        RuleFor(x => x.EndDate).NotEmpty();
        RuleFor(x => x.TotalBudget).GreaterThan(0);
        RuleFor(x => x.GroupSize).GreaterThan(0);
        RuleFor(x => x.StartLat).InclusiveBetween(-90, 90);
        RuleFor(x => x.StartLon).InclusiveBetween(-180, 180);
    }
}
