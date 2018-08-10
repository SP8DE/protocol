using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Explorer.Api.Models;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/latest")]
    [ApiController]
    public class LatestController : ControllerBase
    {
        [HttpGet("blocks")]
        public ActionResult<IList<Sp8deBlock>> GetLatestBlocks(int limit = 10)
        {
            return new List<Sp8deBlock>();
        }

        [HttpGet("transactions")]
        public ActionResult<IList<Sp8deTransaction>> GetLatestTransactions(int limit = 10)
        {
            return new List<Sp8deTransaction>();
        }

        [HttpGet("blockNumber")]
        public ActionResult<Sp8deBlock> GetLatestBlockNumber()
        {
            return new Sp8deBlock();
        }
    }
}