namespace HSTS.Application.Expenses
{
    public record ExpenseDto(
        int Id,
        int TripActivityId,
        string Title,
        string? Description,
        decimal TotalAmount,
        string CreatedByName,
        DateTime CreatedAt,
        string? UpdatedByName,
        DateTime? UpdatedAt
    );
}
