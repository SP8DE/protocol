using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Interfaces;
using Sp8de.Random.Api.Models;
using Sp8de.Random.Api.Services;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RandomController : ControllerBase
    {
        private readonly ISharedSeedService randomService;

        public RandomController(ISharedSeedService randomService)
        {
            this.randomService = randomService;
        }

        // GET api/values/5
        [HttpGet("validate/{id}")]
        public ActionResult<string> Validate(string id)
        {
            throw new NotImplementedException();
        }

        // POST api/values
        [HttpPost("commit")]
        public async Task<ActionResult<CommitResponse>> Commit([FromBody] CommitRequest request)
        {
            throw new NotImplementedException();
        }

        [HttpPost("reveal")]
        public async Task<ActionResult<RevealResponse>> Reveal([FromBody] RevealRequest value)
        {
            throw new NotImplementedException();
        }
    }

}
