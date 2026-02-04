namespace HSTS.Application.Users
{
    public static class UserMappingExtensions
    {
        public static UserDto ToDto(this User user) =>
            new UserDto(user.Id, user.FullName, user.Email);
    }
}
