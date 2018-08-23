using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Explorer.Api.Models;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/blocks")]
    [ApiController]
    public class BlocksController : ControllerBase
    {
        [HttpGet]
        public ActionResult<IList<Sp8deBlock>> Get()
        {
            return new List<Sp8deBlock>();
        }

        [HttpGet("{id}")]
        public ActionResult<Sp8deBlock> Get(int id)
        {
            return new Sp8deBlock();
        }

        [HttpGet("{id}/transactions")]
        public ActionResult<IList<Sp8deTransaction>> GetTransactions(int id)
        {
            return new List<Sp8deTransaction>();
        }
    }
}
