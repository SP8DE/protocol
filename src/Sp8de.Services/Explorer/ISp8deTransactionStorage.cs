using Sp8de.Common.BlockModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.Services.Explorer
{
    public interface ISp8deTransactionStorage
    {
        Task<string> Add(Sp8deTransaction data);
        Task<Sp8deTransaction> Get(string hash);
        Task<IReadOnlyList<Sp8deTransaction>> Search(string q, int limit = 25);
        Task<(IReadOnlyList<Sp8deTransaction> items, long totalResults)> List(int offset = 0, int limit = 25);

        Task<IReadOnlyList<Sp8deTransaction>> GetPending(int limit = 25);
        Task Update(IReadOnlyList<Sp8deTransaction> items);
        Task<IReadOnlyList<Sp8deTransaction>> GetLatest(int limit = 25);
    }    
}