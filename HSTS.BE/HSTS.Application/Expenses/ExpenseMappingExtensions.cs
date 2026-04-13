using HSTS.Domain.Entities;

namespace HSTS.Application.Expenses
{
    public static class ExpenseMappingExtensions
    {
        public static TripMemberDto ToDto(this TripMember member)
        {
            return new TripMemberDto(
                member.Id,
                member.TripId,
                member.UserId,
                member.User?.FullName ?? "",
                member.Role.ToString(),
                member.CreatedAt
            );
        }

        public static ExpenseDto ToDto(this Expense expense, string createdByName, string? updatedByName)
        {
            return new ExpenseDto(
                expense.Id,
                expense.TripActivityId,
                expense.Title,
                expense.Description,
                expense.TotalAmount,
                createdByName,
                expense.CreatedAt,
                updatedByName,
                expense.UpdatedAt
            );
        }
    }
}
