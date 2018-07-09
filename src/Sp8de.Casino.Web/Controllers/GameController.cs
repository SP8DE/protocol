using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Casino.Web.Models;
using Sp8de.Casino.Web.Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace Sp8de.Casino.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameController : Controller
    {
        private readonly IGameService gameService;

        public GameController(IGameService gameService)
        {
            this.gameService = gameService;
        }

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
                WinNumber = RandomInteger(1,6),
                Items = items
            };
        }

        private int RandomInteger(int min, int max)
        {
            using (var rand = new RNGCryptoServiceProvider())
            {
                UInt32 scale = UInt32.MaxValue;
                while (scale == UInt32.MaxValue)
                {
                    // Get four random bytes.
                    byte[] four_bytes = new byte[4];
                    rand.GetBytes(four_bytes);

                    // Convert that into an uint.
                    scale = BitConverter.ToUInt32(four_bytes, 0);
                }

                // Add min to the scaled difference between max and min.
                return (int)(min + (max - min) * (scale / (double)uint.MaxValue));
            }
        }

        private int DemoWinner()
        {
            var rand = new RNGCryptoServiceProvider();
            byte[] arr = new byte[1];
            rand.GetBytes(arr);
            return arr[0] % 2 == 0 ? 0 : 1;
        }
    }

}
