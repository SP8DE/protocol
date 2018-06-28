using Microsoft.EntityFrameworkCore;
using Sp8de.Common.Interfaces;
using Sp8de.DataModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Services
{
    public class ApiKeyManager : IApiKeyManager
    {
        private readonly Sp8deDbContext context;

        public ApiKeyManager(Sp8deDbContext context)
        {
            this.context = context;
        }

        public async Task<ApiSecretInfo> Generate(Guid userId)
        {
            var apiKey = new UserApiKey()
            {
                DateCreated = DateTime.UtcNow,
                IsActive = true,
                ApiKey = RandomUtils.GetRandomString(32),
                ApiSecret = RandomUtils.GetRandomString(64),
                UserId = userId
            };

            context.UserApiKeys.Add(apiKey);

            await context.SaveChangesAsync();

            return new ApiSecretInfo()
            {
                ApiKey = apiKey.ApiKey,
                ApiSecret = apiKey.ApiSecret,
                IsActive = apiKey.IsActive
            };
        }

        public Task<List<ApiSecretInfo>> GetList(Guid userId)
        {
            return context.UserApiKeys
                .Where(x => x.UserId == userId)
                .Select(x => new ApiSecretInfo()
                {
                    ApiKey = x.ApiKey,
                    ApiSecret = x.ApiSecret.Substring(0, 6),
                    IsActive = x.IsActive
                }).ToListAsync();
        }

        public async Task<bool> Remove(string apiKey, Guid userId)
        {
            var item = await context.UserApiKeys.SingleOrDefaultAsync(x => x.ApiKey == apiKey && x.UserId == userId);
            if (item == null)
            {
                return false;
            }
            item.IsActive = false;
            await context.SaveChangesAsync();
            return true;
        }
    }
}
