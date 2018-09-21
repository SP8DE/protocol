using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Explorer.Api.Models;
using Sp8de.Services.Explorer;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/transactions")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        private readonly ISp8deTransactionStorage storage;

        public TransactionsController(ISp8deTransactionStorage storage)
        {
            this.storage = storage;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<Sp8deTransaction>>> Get(int offset = 0, int limit = 25)
        {
            var (items, totalResults) = await storage.List(offset, limit);

            return new PagedResult<Sp8deTransaction>()
            {
                Items = items,
                TotalCount = totalResults
            };
        }

        [HttpGet("{hash}")]
        public async Task<ActionResult<Sp8deTransaction>> Get(string hash)
        {
            var tx = await storage.Get(hash);
            if (tx == null)
            {
                return NotFound();
            }

            return tx;
        }
    }
}
