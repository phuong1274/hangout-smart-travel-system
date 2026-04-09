namespace HSTS.Application.Expenses
{
    public record ExpenseDto(
        int Id,
        int TripActivityId,
        string Title,
        string? Description,
        decimal TotalAmount,
        int CreatedById,
        string CreatedByName,
        DateTime CreatedAt
    );
}
