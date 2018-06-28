using Microsoft.EntityFrameworkCore;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.DataModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Services
{
    public class ApiKeyProvider : IApiKeyProvider
    {
        private readonly Sp8deDbContext context;

        public ApiKeyProvider(Sp8deDbContext context)
        {
            this.context = context;
        }

        public Task<ApiKeyInfo> Get(string apiKey)
        {
            return context.UserApiKeys.Where(x => x.ApiKey == apiKey && x.IsActive)
                .Select(x => new ApiKeyInfo { ApiKeyId = x.Id, UserId = x.UserId })
                .FirstOrDefaultAsync();
        }
    }
}
