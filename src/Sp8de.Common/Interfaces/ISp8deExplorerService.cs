using System.Collections.Generic;
using Sp8de.Common.BlockModels;

namespace Sp8de.Common.Interfaces
{
    public interface ISp8deExplorerService
    {
        Sp8deBlock GetBlock(long blockNumber);
        IList<Sp8deBlock> GetBlocks(long offset, long limit);
        IList<Sp8deTransaction> GetBlockTransactions(long blockNumber);
        IList<Sp8deBlock> GetLatestBlocks(long limit);
        Sp8deTransaction GetTransaction(string hash);
    }
}