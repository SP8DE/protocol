using System.Collections.Generic;
using System.Threading.Tasks;
using Sp8de.Common.BlockModels;

namespace Sp8de.Common.Interfaces
{
    public interface ISp8deBlockStorage
    {
        Task<long> Add(Sp8deBlock data);
        Task<Sp8deBlock> Get(long id);
        Task<Sp8deBlock> GetByHash(string hash);
        Task<IReadOnlyList<Sp8deTransaction>> GetTransactions(long blockId);
        Task<Sp8deBlock> GetLatestBlock();
        Task<(IReadOnlyList<Sp8deBlock> items, long totalResults)> List(int offset = 0, int limit = 25);
        Task<IReadOnlyList<Sp8deBlock>> Search(string q, int limit = 25);
    }
}