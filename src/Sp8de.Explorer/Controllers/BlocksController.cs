﻿using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Explorer.Api.Models;
using Sp8de.Services.Explorer;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/blocks")]
    [ApiController]
    public class BlocksController : ControllerBase
    {
        private readonly Sp8deBlockStorage blockStorage;

        public BlocksController(Sp8deBlockStorage blockStorage)
        {
            this.blockStorage = blockStorage;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<Sp8deBlock>>> Get(int offset = 0, int limit = 25)
        {
            var (items, totalResults) = await blockStorage.List(offset, limit);

            return new PagedResult<Sp8deBlock>()
            {
                Items = items,
                TotalCount = totalResults
            };
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Sp8deBlock>> Get(long id)
        {
            var rs = await blockStorage.Get(id);
            if (rs == null)
            {
                return NotFound();
            }

            return rs;
        }

        [HttpGet("{id}/transactions")]
        public async Task<ActionResult<IList<Sp8deTransaction>>> GetTransactions(int id)
        {
            var rs = await blockStorage.Get(id);
            if (rs == null)
            {
                return NotFound();
            }

            var transactions = await blockStorage.GetTransactions(rs.Id);

            return transactions.ToList();
        }
    }
}
