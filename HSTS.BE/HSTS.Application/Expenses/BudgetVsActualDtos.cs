namespace HSTS.Application.Expenses
{
    public record ActivityBudgetVsActualDto(
        int ActivityId,
        string ActivityTitle,
        int DayNumber,
        decimal EstimatedCost,
        decimal ActualCost,
        decimal Variance,
        string Currency,
        BudgetStatus Status
    );

    public record CategoryBudgetVsActualDto(
        string Category,
        decimal EstimatedCost,
        decimal ActualCost,
        decimal Variance,
        string Currency,
        BudgetStatus Status
    );

    public record TripBudgetVsActualDto(
        int TripId,
        string TripName,
        decimal TotalEstimated,
        decimal TotalActual,
        decimal TotalVariance,
        string Currency,
        BudgetStatus OverallStatus,
        List<CategoryBudgetVsActualDto> Categories,
        List<ActivityBudgetVsActualDto> Activities
    );

    public enum BudgetStatus
    {
        UnderBudget,
        OnBudget,
        OverBudget,
        NoBudget
    }
}
