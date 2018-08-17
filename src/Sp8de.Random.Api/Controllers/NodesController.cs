using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Random.Api.Models;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/nodes")]
    [ApiController]
    public class NodesController : ControllerBase
    {
        [HttpGet]
        public List<NodeInfo> Get()
        {
            return new List<NodeInfo>()
            {
                new NodeInfo ()
                {
                    Url = "https://api-node1.sp8de.com",
                    Key = "0x492d0fd814940d1375225a7e10905585b72b0a8c"
                }
            };
        }
    }
}