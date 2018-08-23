using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using System;

namespace Sp8de.DemoGame.Web.Controllers
{
    [EnableCors("AllowAllOrigins")]
    [Route("api/[controller]")]
    [ApiController]
    public class PingController : ControllerBase
    {
        [HttpGet]
        public string Get()
        {
            return $"Pong {DateTime.UtcNow}";
        }

        [Authorize]
        [HttpGet("autorized")]
        public string AutorizedGet()
        {
            return $"Autorized Pong {DateTime.UtcNow}";
        }
    }
}
