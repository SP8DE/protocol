using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.EthServices;
using Sp8de.RandomGenerators;
using Sp8de.Services.Explorer;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/seed")]
    [ApiController]
    public class SeedController : Controller
    {
        private readonly EthSignService signService;
        private readonly EthKeySecretManager secretManager;
        private readonly IKeySecret[] keys;
        private readonly PRNGRandomService prng;
        private readonly ISp8deTransactionStorage storage;
        private readonly Sp8deBlockService blockService;

        public SeedController(ISp8deTransactionStorage storage)
        {
            signService = new EthSignService();
            secretManager = new EthKeySecretManager();

            keys = new[]
            {
                "d7d60dc1c9376fe0011a854fef00d62dbfb9c7224954c396d057d02223abd2ea",
                "42e40a6e9ccdf1003f8be7230db99d2d1a87f42fb0d0969b472da9325dcda7af",
                "f03efed83ff22c7ed2d8d2e7f45b8d20f800f2036ad9ebf569c71d77dca318b3"
            }
            .Select(x => secretManager.LoadKeySecret(x))
            .ToArray();

            //prng = new PRNGRandomService();
            this.storage = storage;
            this.blockService = new Sp8deBlockService(new Sp8deNodeConfig() { Key = EthKeySecret.Load("d7d60dc1c9376fe0011a854fef00d62dbfb9c7224954c396d057d02223abd2ea") });
        }

        [HttpGet("transactions")]
        public async Task<ActionResult> Transactions(int limit = 100)
        {
            Stopwatch sw = new Stopwatch();
            sw.Start();
            List<Sp8deTransaction> list = await SeedTransactions(limit);
            
            foreach (var item in list)
            {
                await storage.Add(item);
            }
            sw.Stop();

            return Ok(sw.ElapsedMilliseconds);
        }

        [HttpGet("blocks")]
        public async Task<ActionResult> Blocks(int limit = 10)
        {
            List<Sp8deTransaction> list = await SeedTransactions(limit);

            var blocks = new List<Sp8deBlock>();

            var block = new Sp8deBlock();
            for (int i = 0; i < limit; i++)
            {
                block = blockService.GenerateNewBlock(list.Skip(i * 10).Take(10).ToList(), block);

                blocks.Add(block);
            }

            return Ok();
        }

        private async Task<List<Sp8deTransaction>> SeedTransactions(int limit)
        {
            var list = new List<Sp8deTransaction>();
            for (int secret = 10000; secret < 10000 + limit; secret++)
            {
                var innerItems = new List<InternalTransaction>();
                for (int i = 0; i < keys.Length; i++)
                {
                    var key = keys[i];

                    var tx = new InternalTransaction()
                    {
                        Type = Sp8deTransactionType.InternalReveal,
                        Nonce = 1,
                        From = key.PublicAddress,
                        Data = secret + i
                    };

                    tx.Sign = signService.SignMessage($"{tx.From.ToLower()};{tx.Nonce};{tx.Data}", key.PrivateKey);

                    innerItems.Add(tx);
                }
                list.Add(blockService.GenerateNewTransaction(innerItems, Sp8deTransactionType.AggregatedReveal));
            }

            return list;
        }
    }
}