using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Services.Explorer
{
    public class Sp8deSearchService : ISp8deSearchService
    {
        private readonly ISp8deBlockStorage blockStorage;
        private readonly ISp8deTransactionStorage transactionStorage;

        public Sp8deSearchService(ISp8deBlockStorage blockStorage, ISp8deTransactionStorage transactionStorage)
        {
            this.blockStorage = blockStorage;
            this.transactionStorage = transactionStorage;
        }

        public async Task<List<SearchItem>> Search(string q, int limit = 25)
        {
            var list = new List<SearchItem>();

            var blocks = await blockStorage.Search(q, limit);
            list.AddRange(blocks.Select(x => new SearchItem() { Hash = x.Hash, Type = SearchItemType.Block, BlockId = x.Id, Timestamp = x.Timestamp }));

            var transactions = await transactionStorage.Search(q, limit);
            list.AddRange(transactions.Select(x => new SearchItem() { Hash = x.Id, Type = SearchItemType.Transaction, BlockId = x.Meta?.BlockId, TransactionType = x.Type, Timestamp = x.Timestamp }));

            return list;
        }
    }
}
