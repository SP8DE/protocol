using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Random.Api.Models;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RandomController : ControllerBase
    {
        // GET api/values/5
        [HttpGet("validate/{id}")]
        public ActionResult<string> Validate(string id)
        {
            throw new NotImplementedException();
        }

        // POST api/values
        [HttpPost("commit")]
        public async Task<IActionResult> Commit([FromBody] CommitRequest request)
        {
            throw new NotImplementedException();
        }

        [HttpPost("reveal")]
        public async Task<IActionResult> Reveal([FromBody]  RevealRequest value)
        {
            throw new NotImplementedException();
        }
    }

}
