using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using HSTS.Application.Interfaces;
using HSTS.Infrastructure.Settings;
using Microsoft.Extensions.Options;
using System.Text.RegularExpressions;

namespace HSTS.Infrastructure.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IOptions<CloudinarySettings> options)
        {
            var s = options.Value;
            var account = new CloudinaryDotNet.Account(s.CloudName, s.ApiKey, s.ApiSecret);
            _cloudinary = new Cloudinary(account) { Api = { Secure = true } };
        }

        public async Task<string> UploadImageAsync(
            byte[] fileBytes,
            string contentType,
            string fileName,
            string? oldAvatarUrl = null)
        {
            if (oldAvatarUrl is not null)
            {
                var oldPublicId = ExtractPublicId(oldAvatarUrl);
                await _cloudinary.DestroyAsync(new DeletionParams(oldPublicId));
            }

            using var stream = new MemoryStream(fileBytes);
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, stream),
                Folder = "avatars",
                Overwrite = false
            };

            var result = await _cloudinary.UploadAsync(uploadParams);
            return result.SecureUrl.ToString();
        }

        /// <summary>
        /// Extracts Cloudinary public ID from a stored URL.
        /// Input:  "https://res.cloudinary.com/{cloud}/image/upload/v1234/avatars/abc.jpg"
        /// Output: "avatars/abc"
        /// Handles: version present/absent, public IDs with folder slashes.
        /// Does NOT handle transformation URLs (we never store those).
        /// </summary>
        private static string ExtractPublicId(string avatarUrl)
        {
            var uploadIndex = avatarUrl.IndexOf("/upload/", StringComparison.Ordinal);
            if (uploadIndex < 0) return avatarUrl;

            var afterUpload = avatarUrl[(uploadIndex + 8)..];

            // Strip version segment e.g. "v1234567890/"
            afterUpload = Regex.Replace(afterUpload, @"^v\d+/", "");

            // Strip file extension
            var dotIndex = afterUpload.LastIndexOf('.');
            return dotIndex >= 0 ? afterUpload[..dotIndex] : afterUpload;
        }
    }
}
