using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Sp8de.DemoGame.Web.Models;
using Sp8de.Common.Interfaces;

namespace Sp8de.DemoGame.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DemoGameController : Controller
    {
        private readonly IMemoryCache cache;
        private readonly IPRNGRandomService prng;

        public DemoGameController(IMemoryCache cache, IPRNGRandomService prng)
        {
            this.cache = cache;
            this.prng = prng;
        }

        [ProducesResponseType(200, Type = typeof(GameStartResponse))]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [Route("start")]
        [HttpPost]
        public ActionResult<GameStartResponse> Start([FromBody]GameStartRequest model)
        {
            switch (model.Type)
            {
                case GameType.Dice:
                    if (model.Bet == null || model.Bet.Length < 1 || model.Bet.Length > 5 || model.Bet.Any(x => x < 1 || x > 6))
                    {
                        return BadRequest(new List<Error>{
                            new Error()
                            {
                                Message = "Invalid Bet"
                            }
                        });
                    }
                    break;
                case GameType.TossCoin:
                    if (model.Bet == null || model.Bet.Length != 1 || model.Bet.Single() < 0 || model.Bet.Single() > 1)
                    {
                        return BadRequest(new Error()
                        {
                            Message = "Invalid Bet"
                        });
                    }
                    break;
                default:
                    throw new NotImplementedException();
            }



            var list = new List<SignedItem>
            {
                new SignedItem()
                {
                    PubKey = model.PubKey,
                    Nonce = model.Nonce,
                    Sign = model.Sign
                },
                new SignedItem()
                {
                    PubKey = "0x492d0fd814940d1375225a7e10905585b72b0a8c",
                    Nonce = 1,
                    Sign = "0xd7856f3065716ec57f226caf2c8456fb86890244d6e2d153c90265a5c957ef5b6d7f3d544b38cef5bd9dda5ede58d63c7868cccab136caded72d06425264ef851c"
                },
                new SignedItem()
                {

                    PubKey = "0x492d0fd814940d1375225a7e10905585b72b0a8c",
                    Nonce = 1,
                    Sign = "0xe2f4cd56aaec60229ee9c53731f609aa8468bcae72bcc2ba82a1bafb9482f32e41c87e3f008f5dcc18eccc71fcdc6699990c9edb6fb100c165395983f50730741b",
                },
            };

            var rs = new GameStartResponse()
            {
                GameId = Guid.NewGuid().ToString("n"),
                GameType = model.Type,
                Bet = model.Bet,
                BetAmount = model.BetAmount,
                Items = list
            };

            var game = cache.Set(rs.GameId, rs);

            return rs;
        }

        [ProducesResponseType(200, Type = typeof(GameStartResponse))]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [Route("end")]
        [HttpPost]
        public ActionResult<GameFinishResponse> End([FromBody]GameFinishRequest model)
        {
            var game = cache.Get<GameStartResponse>(model.GameId);

            var list = new List<RevealItem>
            {
                new RevealItem()
                {
                    PubKey = model.PubKey,
                    Nonce = model.Nonce,
                    Seed = model.Seed,
                    Sign = model.Sign
                },
                new RevealItem()
                {
                    PubKey = "0x492d0fd814940d1375225a7e10905585b72b0a8c",
                    Nonce = 1,
                    Seed = 1,
                    Sign = "0xd7856f3065716ec57f226caf2c8456fb86890244d6e2d153c90265a5c957ef5b6d7f3d544b38cef5bd9dda5ede58d63c7868cccab136caded72d06425264ef851c"
                },
                new RevealItem()
                {

                    PubKey = "0x492d0fd814940d1375225a7e10905585b72b0a8c",
                    Nonce = 1,
                    Seed = 1,
                    Sign = "0xe2f4cd56aaec60229ee9c53731f609aa8468bcae72bcc2ba82a1bafb9482f32e41c87e3f008f5dcc18eccc71fcdc6699990c9edb6fb100c165395983f50730741b",
                }
            };

            var seed = CreateSharedSeedByStrings(list.Select(x => x.Seed.ToString()).ToArray());

            DemoGameLogic(game, seed, out int[] winNumbers, out decimal winAmount, out bool isWinner);

            return new GameFinishResponse()
            {
                GameId = model.GameId,
                SharedSeedArray = seed.seedArray,
                SharedSeedHash = seed.seedHash,
                ValidationTxHash = "0x1234567890", //TODO                
                Items = list,
                IsWinner = isWinner,
                WinAmount = winAmount,
                WinNumbers = winNumbers
            };
        }

        private void DemoGameLogic(GameStartResponse game, (IList<int> seedArray, string seedHash) seed, out int[] winNumbers, out decimal winAmount, out bool isWinner)
        {

            if (game.GameType == GameType.Dice)
            {
                winNumbers = prng.Generate(seed.seedArray, 1, 1, 6);
                winAmount = 0;
                isWinner = false;
                if (game.Bet.Contains(winNumbers.Single()))
                {
                    isWinner = true;
                    winAmount = game.BetAmount / game.Bet.Length;
                }
            }

            if (game.GameType == GameType.TossCoin)
            {
                winNumbers = prng.Generate(seed.seedArray, 1, 0, 1);
                winAmount = 0;
                isWinner = false;
                if (game.Bet.Single() == winNumbers.Single())
                {
                    isWinner = true;
                    winAmount = game.BetAmount;
                }
            }

            throw new NotImplementedException();
        }

        public static (IList<int> seedArray, string seedHash) CreateSharedSeedByStrings(IEnumerable<string> sharedSeedData)
        {
            var aggregated = string.Join(";", sharedSeedData);

            using (var hasher = SHA384.Create())
            {
                var hashedBytes = hasher.ComputeHash(Encoding.ASCII.GetBytes(aggregated));
                string hex = SeedToHex(hashedBytes);
                var size = hashedBytes.Count() / sizeof(int);
                var ints = new int[size];
                for (var index = 0; index < size; index++)
                {
                    ints[index] = BitConverter.ToInt32(hashedBytes, index * sizeof(int));
                }

                return (ints, hex);
            }
        }

        public static string SeedToHex(byte[] bytes)
        {
            char[] c = new char[bytes.Length * 2 + 2];

            byte b;

            c[0] = '0';
            c[1] = 'x';

            for (int bx = 0, cx = 2; bx < bytes.Length; ++bx, ++cx)
            {
                b = ((byte)(bytes[bx] >> 4));
                c[cx] = (char)(b > 9 ? b + 0x37 + 0x20 : b + 0x30);

                b = ((byte)(bytes[bx] & 0x0F));
                c[++cx] = (char)(b > 9 ? b + 0x37 + 0x20 : b + 0x30);
            }

            return new string(c);
        }
    }

}
