using FluentAssertions;
using HSTS.Application.Interfaces;
using HSTS.Application.Users.Commands;
using HSTS.Tests.Helpers;
using Moq;

namespace HSTS.Tests.Users;

public class UploadAvatarCommandTests
{
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<ICloudinaryService> _cloudinary = new();

    public UploadAvatarCommandTests()
    {
        _currentUser.Setup(x => x.UserId).Returns(1);
        _cloudinary
            .Setup(x => x.UploadImageAsync(
                It.IsAny<byte[]>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>()))
            .ReturnsAsync("https://res.cloudinary.com/demo/image/upload/v1/avatars/new.jpg");
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsNotFound()
    {
        var ctx = MockDbContextFactory.Create().Build();
        var handler = new UploadAvatarCommandHandler(ctx.Object, _currentUser.Object, _cloudinary.Object);

        var result = await handler.Handle(
            new UploadAvatarCommand(new byte[] { 1, 2, 3 }, "image/jpeg", "avatar.jpg"),
            CancellationToken.None);

        result.IsError.Should().BeTrue();
        result.FirstError.Code.Should().Be("User.NotFound");
    }

    [Fact]
    public async Task Handle_ValidFile_UploadsAndSavesUrl()
    {
        var account = AuthFakes.ActiveAccount();
        var user = AuthFakes.UserFor(account);
        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .Build();
        var handler = new UploadAvatarCommandHandler(ctx.Object, _currentUser.Object, _cloudinary.Object);

        var result = await handler.Handle(
            new UploadAvatarCommand(new byte[] { 1, 2, 3 }, "image/jpeg", "avatar.jpg"),
            CancellationToken.None);

        result.IsError.Should().BeFalse();
        user.AvatarUrl.Should().Be("https://res.cloudinary.com/demo/image/upload/v1/avatars/new.jpg");
        _cloudinary.Verify(x => x.UploadImageAsync(
            It.IsAny<byte[]>(), "image/jpeg", "avatar.jpg", null), Times.Once);
    }

    [Fact]
    public async Task Handle_ExistingAvatar_PassesOldUrlToCloudinary()
    {
        var account = AuthFakes.ActiveAccount();
        var user = AuthFakes.UserFor(account);
        user.AvatarUrl = "https://res.cloudinary.com/demo/image/upload/v1/avatars/old.jpg";
        var ctx = MockDbContextFactory.Create()
            .WithAccounts(account)
            .WithUsers(user)
            .Build();
        var handler = new UploadAvatarCommandHandler(ctx.Object, _currentUser.Object, _cloudinary.Object);

        await handler.Handle(
            new UploadAvatarCommand(new byte[] { 1, 2, 3 }, "image/jpeg", "new.jpg"),
            CancellationToken.None);

        _cloudinary.Verify(x => x.UploadImageAsync(
            It.IsAny<byte[]>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            "https://res.cloudinary.com/demo/image/upload/v1/avatars/old.jpg"), Times.Once);
    }
}
