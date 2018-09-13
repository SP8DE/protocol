using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
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
        private readonly ISp8deSearchService searchService;

        public SearchController(ISp8deSearchService searchService)
        {
            this.searchService = searchService;
        }

        [HttpGet()]
        public async Task<ActionResult<IList<SearchItem>>> Get(string q)
        {
            var rs = await searchService.Search(q);
            return rs;
        }
    }
}