using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.EthServices;
using Sp8de.RandomGenerators;
using Sp8de.Services.Explorer;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Xunit;

namespace Sp8de.Services.Tests.Integration
{
    public class TransactionsServiceTests
    {
        private readonly EthCryptoService signService;
        private readonly EthKeySecretManager secretManager;
        private readonly IKeySecret[] keys;
        private readonly PRNGRandomService prng;
        private int limit = 100;

        public TransactionsServiceTests()
        {
            signService = new EthCryptoService();
            secretManager = new EthKeySecretManager();

            keys = new[]
            {
                "d7d60dc1c9376fe0011a854fef00d62dbfb9c7224954c396d057d02223abd2ea",
                "42e40a6e9ccdf1003f8be7230db99d2d1a87f42fb0d0969b472da9325dcda7af",
                "f03efed83ff22c7ed2d8d2e7f45b8d20f800f2036ad9ebf569c71d77dca318b3"
            }
            .Select(x => secretManager.LoadKeySecret(x))
            .ToArray();

            prng = new PRNGRandomService();
        }

        [Fact]
        public void Tests()
        {
            var blockService = new Sp8deTransactionService(new Sp8deNodeConfig() { Key = keys.First() });

            var list = new List<Sp8deTransaction>();
            for (int secret = 10000; secret < 10100; secret++)
            {
                var innerItems = new List<InternalTransaction>();
                for (int i = 0; i < keys.Length; i++)
                {
                    var key = keys[i];

                    var tx = new InternalTransaction()
                    {
                        Type = Sp8deTransactionType.InternalReveal,
                        Nonce = (1).ToString(),
                        From = key.PublicAddress,
                        Data = (secret + i).ToString()
                    };

                    tx.Sign = signService.SignMessage($"{tx.From.ToLower()};{tx.Nonce};{tx.Data}", key.PrivateKey);

                    innerItems.Add(tx);
                }
                list.Add(blockService.GenerateNewTransaction(innerItems, Sp8deTransactionType.AggregatedReveal));
            }                

            var blocks = new List<Sp8deBlock>();

            var block = new Sp8deBlock();
            for (int i = 0; i < 10; i++)
            {
                block = blockService.GenerateNewBlock(list.Skip(i * 10).Take(10).ToList(), block);

                blocks.Add(block);
            }

            Assert.NotEmpty(blocks);
        }
    }
}
