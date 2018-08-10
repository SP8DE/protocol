using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Explorer.Api.Models;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/transactions")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        [HttpGet]
        public ActionResult<IList<Sp8deTransaction>> Get()
        {
            return new List<Sp8deTransaction>();
        }

        [HttpGet("{hash}")]
        public ActionResult<Sp8deTransaction> Get(string hash)
        {
            return new Sp8deTransaction();
        }
    }
}
