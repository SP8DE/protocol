using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Services.Explorer;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/latest")]
    [ApiController]
    public class LatestController : ControllerBase
    {
        private readonly Sp8deBlockStorage blockStorage;
        private readonly ISp8deTransactionStorage transactionStorage;

        public LatestController(Sp8deBlockStorage blockStorage, ISp8deTransactionStorage transactionStorage)
        {
            this.blockStorage = blockStorage;
            this.transactionStorage = transactionStorage;
        }

        [HttpGet("block")]
        public async Task<ActionResult<Sp8deBlock>> GetLatestBlock()
        {
            return await blockStorage.GetLatestBlock();
        }

        [HttpGet("transactions")]
        public async Task<ActionResult<IList<Sp8deTransaction>>> GetLatestTransactions(int limit = 10)
        {
            var rs = await transactionStorage.GetLatest(limit);
            return rs.ToList();
        }

        [HttpGet("blockNumber")]
        public async Task<ActionResult<long>> GetLatestBlockNumber()
        {
            return (await blockStorage.GetLatestBlock())?.Id;
        }
    }
}