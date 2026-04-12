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
                member.Name,
                member.Role.ToString(),
                member.Role,
                member.CreatedAt
            );
        }

        public static ExpenseDto ToDto(this Expense expense)
        {
            return new ExpenseDto(
                expense.Id,
                expense.TripActivityId,
                expense.Title,
                expense.Description,
                expense.TotalAmount,
                expense.CreatedById,
                expense.CreatedByMember.User.FullName,
                expense.CreatedAt
            );
        }
    }
}
