using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IApiKeyManager
    {
        Task<List<ApiSecretInfo>> GetList(Guid userId);
        Task<ApiSecretInfo> Generate(Guid userId);
        Task<bool> Remove(string apiKey, Guid userId);
    }
}
