namespace HSTS.Application.Expenses
{
    public record ExpenseTotalDto(
        int TripId,
        decimal TotalAmount,
        string Currency,
        int ExpenseCount
    );

    public record ExpenseByTimelineDto(
        int TripActivityId,
        string ActivityDescription,
        int DayNumber,
        decimal TotalAmount,
        string Currency,
        int ExpenseCount
    );
}
