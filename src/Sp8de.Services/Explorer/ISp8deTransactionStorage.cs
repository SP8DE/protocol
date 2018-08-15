using System.Collections.Generic;
using System.Threading.Tasks;
using Sp8de.Common.BlockModels;

namespace Sp8de.Services.Explorer
{
    public interface ISp8deTransactionStorage
    {
        Task<string> Add(Sp8deTransaction data);
        Task<Sp8deTransaction> Get(string hash);
        Task<(IReadOnlyList<Sp8deTransaction>, long totalResults)> List(int offset = 0, int limit = 25);
    }
}