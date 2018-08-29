using Microsoft.AspNetCore.Mvc;
using Sp8de.Explorer.Api.Models;
using Sp8de.Services.Explorer;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/search")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly ISp8deTransactionStorage storage;

        public SearchController(ISp8deTransactionStorage storage)
        {
            this.storage = storage;
        }

        [HttpGet()]
        public async Task<ActionResult<IList<SearchItem>>> Get(string q)
        {
            var rs = await storage.Search(q);
            return rs.Select(x => new SearchItem()
            {
                Hash = x.Id,
                Type = SearchItemType.Transaction
            }).ToArray();
        }
    }
}