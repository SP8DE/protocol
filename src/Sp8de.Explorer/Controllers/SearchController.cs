using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Explorer.Api.Models;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/search")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        [HttpGet()]
        public ActionResult<PagedResult<SearchItem>> Get(string q)
        {
            return new PagedResult<SearchItem>()
            {
                Items = new List<SearchItem>
                {
                    new SearchItem{
                        Hash ="0x12345",
                        Type = SearchItemType.Transaction
                    }
                }
            };
        }
    }


}