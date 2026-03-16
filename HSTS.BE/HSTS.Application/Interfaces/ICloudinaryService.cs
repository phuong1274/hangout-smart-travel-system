namespace HSTS.Application.Interfaces
{
    /// <summary>
    /// Cross-cutting service for Cloudinary image operations.
    /// Uses BCL types only — no ASP.NET infrastructure types.
    /// Placed alongside IAppDbContext and ICurrentUserService.
    /// </summary>
    public interface ICloudinaryService
    {
        /// <summary>
        /// Uploads image bytes to Cloudinary.
        /// If oldAvatarUrl is provided, deletes the old image first (silent failure).
        /// Returns the secure HTTPS URL of the uploaded image.
        /// </summary>
        Task<string> UploadImageAsync(
            byte[] fileBytes,
            string contentType,
            string fileName,
            string? oldAvatarUrl = null);
    }
}
