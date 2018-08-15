using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Models
{
    public class Sp8deExplorerService : ISp8deExplorerService
    {
        public Sp8deTransaction GetTransaction(string hash)
        {
            throw new NotImplementedException();
        }

        public IList<Sp8deTransaction> GetTransactions(long offset, long limit)
        {
            throw new NotImplementedException();
        }

        public Sp8deBlock GetBlock(long blockNumber)
        {
            throw new NotImplementedException();
        }

        public IList<Sp8deBlock> GetBlocks(long offset, long limit)
        {
            throw new NotImplementedException();
        }

        public IList<Sp8deBlock> GetLatestBlocks(long limit)
        {
            throw new NotImplementedException();
        }

        public IList<Sp8deTransaction> GetBlockTransactions(long blockNumber)
        {
            throw new NotImplementedException();
        }
    }
}
