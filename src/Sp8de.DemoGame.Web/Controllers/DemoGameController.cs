using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.DemoGame.Web.Models;
using Sp8de.DemoGame.Web.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DemoGameController : Controller
    {
        private readonly IMemoryCache cache;
        private readonly IPRNGRandomService prng;
        private readonly ISignService signService;
        private readonly IRandomContributorService randomContributorService;
        private readonly IChaosProtocolService protocol;

        public DemoGameController(IMemoryCache cache, IPRNGRandomService prng, ISignService signService, IRandomContributorService randomContributorService, IChaosProtocolService protocol)
        {
            this.cache = cache;
            this.prng = prng;
            this.signService = signService;
            this.randomContributorService = randomContributorService;
            this.protocol = protocol;
        }

        [ProducesResponseType(200, Type = typeof(GameStartResponse))]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [Route("start")]
        [HttpPost]
        public async Task<ActionResult<GameStartResponse>> Start([FromBody]GameStartRequest model)
        {
            switch (model.Type)
            {
                case GameType.Dice:
                    if (model.Bet == null || model.Bet.Length < 1 || model.Bet.Length > 5 || model.Bet.Any(x => x < 1 || x > 6))
                    {
                        return BadRequest(ErrorResult.Create("Invalid Bet"));
                    }
                    break;
                case GameType.TossCoin:
                    if (model.Bet == null || model.Bet.Length != 1 || model.Bet.Single() < 0 || model.Bet.Single() > 1)
                    {
                        return BadRequest(ErrorResult.Create("Invalid Bet"));
                    }
                    break;
                default:
                    throw new NotImplementedException();
            }

            var commit = await randomContributorService.GenerateCommit(DateTime.UtcNow.Ticks.ToString());

            var list = new List<SignedItem>
            {
                new SignedItem()
                {
                    PubKey = model.PubKey,
                    Nonce = model.Nonce.ToString(),
                    Sign = model.Sign
                },
                commit
            };

            var tx = await protocol.CreateTransaction(list, ChaosProtocolSettings.Default);

            var rs = new GameStartResponse()
            {
                GameId = Guid.NewGuid().ToString("n"),
                ValidationTx = tx.Id,
                GameType = model.Type,
                Bet = model.Bet,
                BetAmount = model.BetAmount,
                Items = tx.Items,
                IpfsHash = tx.Anchor.Data
            };

            var game = cache.Set(rs.GameId, rs);

            return rs;
        }

        [ProducesResponseType(200, Type = typeof(GameFinishResponse))]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [ProducesResponseType(404)]
        [Route("end")]
        [HttpPost]
        public async Task<ActionResult<GameFinishResponse>> End([FromBody]GameFinishRequest model)
        {
            var game = cache.Get<GameStartResponse>(model.GameId);

            if (game == null)
            {
                return NotFound();
            }
            var requesterCommit = game.Items.First(x => x.Type == UserType.Requester);

            var revealItem = await randomContributorService.Reveal(requesterCommit);

            var list = new List<RevealItem>
            {
                new RevealItem()
                {
                    Type = UserType.Contributor,
                    PubKey = model.PubKey,
                    Nonce = model.Nonce.ToString(),
                    Seed = model.Seed,
                    Sign = model.Sign
                },
                revealItem
            };
            
            var tx = await protocol.RevealTransaction(game.ValidationTx, list);

            

            var seedItems = tx.Items.Select(x => (x as RevealItem).Seed.ToString()).ToArray();

            var seed = CreateSharedSeedByStrings(seedItems);

            DemoGameLogic(game, seed, out int[] winNumbers, out decimal winAmount, out bool isWinner);

            return new GameFinishResponse()
            {
                GameId = model.GameId,
                SharedSeedArray = seed.seedArray,
                SharedSeedHash = seed.seedHash,
                ValidationTxHash = tx.Id, //TODO                
                Items = list,
                
                IsWinner = isWinner,
                WinAmount = winAmount,
                WinNumbers = winNumbers,

                IpfsHash = tx.Anchor.Data
            };
        }

        private void DemoGameLogic(GameStartResponse game, (IList<uint> seedArray, string seedHash) seed, out int[] winNumbers, out decimal winAmount, out bool isWinner)
        {
            switch (game.GameType)
            {
                case GameType.TossCoin:
                    winNumbers = prng.Generate(seed.seedArray, 1, 0, 1);
                    winAmount = 0;
                    isWinner = false;
                    if (game.Bet.Single() == winNumbers.Single())
                    {
                        isWinner = true;
                        winAmount = game.BetAmount;
                    }
                    break;
                case GameType.Dice:
                    winNumbers = prng.Generate(seed.seedArray, 1, 1, 6);
                    winAmount = 0;
                    isWinner = false;
                    if (game.Bet.Contains(winNumbers.Single()))
                    {
                        isWinner = true;
                        winAmount = game.BetAmount / game.Bet.Length;
                    }
                    break;
                default:
                    throw new NotImplementedException();
            }
        }

        public static (IList<uint> seedArray, string seedHash) CreateSharedSeedByStrings(IEnumerable<string> sharedSeedData)
        {
            var aggregated = string.Join(";", sharedSeedData);

            using (var hasher = SHA384.Create())
            {
                var hashedBytes = hasher.ComputeHash(Encoding.ASCII.GetBytes(aggregated));
                string hex = SeedToHex(hashedBytes);
                var size = hashedBytes.Count() / sizeof(int);
                var ints = new uint[size];
                for (var index = 0; index < size; index++)
                {
                    ints[index] = BitConverter.ToUInt32(hashedBytes, index * sizeof(uint));
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
