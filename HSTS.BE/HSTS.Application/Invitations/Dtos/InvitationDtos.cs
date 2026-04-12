namespace HSTS.Application.Invitations.Dtos
{
    public record TripInvitationDto(
        int Id,
        int TripId,
        string TripName,
        string InviterName,
        string InviteeName,
        string Token,
        DateTime ExpirationDate,
        string Status,
        DateTime CreatedAt
    );

    public record InvitationVerifyDto(
        int InvitationId,
        int TripId,
        string TripName,
        string InviterName
    );
}
