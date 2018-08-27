using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using System;

namespace Sp8de.DemoGame.Web.Controllers
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

        [Authorize]
        [HttpGet("authorized")]
        public string AutorizedGet()
        {
            return $"Authorized Pong {DateTime.UtcNow}";
        }

        [HttpGet("error")]
        [ProducesResponseType(500, Type = typeof(ProblemDetails))]
        public string Error()
        {
            throw new NotImplementedException();
        }       
    }
}
