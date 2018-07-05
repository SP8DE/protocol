using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Casino.Web.Models;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace Sp8de.Casino.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DemoGameController : Controller
    {
        [Route("start")]
        [HttpPost]
        public ActionResult<GameStartResponse> Start([FromBody]GameStartRequest model)
        {
            var items = Enumerable.Range(1, 3).Select(x => new SignedItem()
            {
                PubKey = $"PubKey{x}",
                Salt = $"Salt{x}",
                Sign = $"Sign{x}"
            }).ToList();

            return new GameStartResponse()
            {
                GameId = Guid.NewGuid().ToString("n"),
                Items = items
            };
        }

        [Route("end")]
        [HttpPost]
        public ActionResult<GameFinishResponse> End([FromBody]GameFinishRequest value)
        {
            var items = Enumerable.Range(1, 3).Select(x => new RevealItem()
            {
                PubKey = $"PubKey{x}",
                Salt = $"Salt{x}",
                Sign = $"Sign{x}",
                Seed = 1
            }).ToList();

            return new GameFinishResponse()
            {
                GameId = value.GameId,
                IsWinner = DemoWinner(),
                Items = items
            };
        }

        private bool DemoWinner()
        {
            var rand = new RNGCryptoServiceProvider();
            byte[] arr = new byte[1];
            rand.GetBytes(arr);
            return arr[0] % 2 == 0;
        }
    }

}
