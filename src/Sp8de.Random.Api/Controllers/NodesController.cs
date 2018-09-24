using Microsoft.AspNetCore.Mvc;
using Sp8de.Random.Api.Models;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/nodes")]
    [ApiController]
    public class NodesController : ControllerBase
    {
        private readonly RandomApiConfig config;

        public NodesController(RandomApiConfig config)
        {
            this.config = config;
        }

        [HttpGet]
        public ActionResult<List<NodeInfo>> Get()
        {
            return config.Nodes;
        }
    }
}