using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.Common.RandomModels;
using Sp8de.Common.Utils;
using Sp8de.DemoGame.Web.Models;
using Sp8de.DemoGame.Web.Services;
using Sp8de.EthServices;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DemoGameController : Controller
    {
        private readonly IMemoryCache cache;
        private readonly IPRNGRandomService prng;
        private readonly ICryptoService signService;
        private readonly IRandomContributorService randomContributorService;
        private readonly IChaosProtocolService protocol;

        public DemoGameController(IMemoryCache cache, IPRNGRandomService prng, ICryptoService signService, IRandomContributorService randomContributorService, IChaosProtocolService protocol)
        {
            this.cache = cache;
            this.prng = prng;
            this.signService = signService;
            this.randomContributorService = randomContributorService;
            this.protocol = protocol;
        }

        [ProducesResponseType(200, Type = typeof(GameStartResponse))]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [ProducesResponseType(500, Type = typeof(ProblemDetails))]
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
                    Type = UserType.Contributor,
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
                IpfsHash = tx.Anchor?.Data
            };

            var game = cache.Set(rs.GameId, rs);

            return rs;
        }

        [ProducesResponseType(200, Type = typeof(GameFinishResponse))]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [ProducesResponseType(404)]
        [ProducesResponseType(500, Type = typeof(ProblemDetails))]
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

            var seedItems = tx.Items.Select(x => (x as RevealItem).Seed).ToArray();

            var seed = SharedSeedGenerator.CreateSharedSeed(seedItems);

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

                IpfsHash = tx.Anchor?.Data
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

    }

}
