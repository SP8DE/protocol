using Sp8de.Common.Models;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{

    public interface IApiKeyProvider
    {
        Task<ApiKeyInfo> Get(string apiKey);
    }
}
