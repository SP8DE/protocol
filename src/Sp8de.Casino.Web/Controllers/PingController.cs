using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Casino.Web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PingController : ControllerBase
    {
        [HttpGet]
        public string Get()
        {
            return $"Pong {DateTime.UtcNow}";
        }
    }
}
