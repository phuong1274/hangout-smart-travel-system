namespace HSTS.Domain.Enums
{
    /// <summary>
    /// Defines roles for trip members with different permissions.
    /// Leader: Full control over the trip
    /// Treasurer: Manages budget and expenses
    /// Member: Regular participant
    /// </summary>
    public enum TripRole
    {
        Leader = 0,
        Treasurer = 1,
        Member = 2
    }
}
