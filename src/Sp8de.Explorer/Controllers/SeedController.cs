﻿using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.EthServices;
using Sp8de.Services;
using Sp8de.Services.Explorer;
using System;
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
        private readonly ICryptoService signService;
        private readonly EthKeySecretManager secretManager;
        private readonly IKeySecret[] keys;
        private readonly ISp8deTransactionStorage storage;
        private readonly Sp8deTransactionService transactionService;

        public SeedController(ISp8deTransactionStorage storage)
        {
            signService = new EthCryptoService();

            keys = new[]{
                "d7d60dc1c9376fe0011a854fef00d62dbfb9c7224954c396d057d02223abd2ea",
                "42e40a6e9ccdf1003f8be7230db99d2d1a87f42fb0d0969b472da9325dcda7af",
                "f03efed83ff22c7ed2d8d2e7f45b8d20f800f2036ad9ebf569c71d77dca318b3"
            }
            .Select(x => EthKeySecret.Load(x))
            .ToArray();

            this.storage = storage;
            this.transactionService = new Sp8deTransactionService(new Sp8deNodeConfig() { Key = keys.Last() });
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

        private async Task<List<Sp8deTransaction>> SeedTransactions(int limit)
        {
            var list = new List<Sp8deTransaction>();

            var rnd = new CRNGRandom();

            int start = rnd.NextInt();

            for (int secret = start; secret < start + limit; secret++)
            {
                var tx1 = CreateTransaction(secret, Sp8deTransactionType.AggregatedCommit);
                list.Add(tx1);

                var tx2 = CreateTransaction(secret, Sp8deTransactionType.AggregatedReveal, tx1.Id);
                list.Add(tx2);
            }

            return list;
        }

        private Sp8deTransaction CreateTransaction(int secret, Sp8deTransactionType type, string dependsOn = null)
        {
            var innerItems = new List<InternalTransaction>();
            for (int i = 0; i < keys.Length; i++)
            {
                var key = keys[i];

                var internalTx = new InternalTransaction()
                {
                    Nonce = ((secret + i) * 3).ToString(),
                    From = key.PublicAddress,
                    Data = (secret / i + i).ToString()
                };

                internalTx.Sign = signService.SignMessage(internalTx.GetDataForSign(), key.PrivateKey);

                switch (type)
                {
                    case Sp8deTransactionType.AggregatedCommit:
                        internalTx.Type = Sp8deTransactionType.InternalCommit;
                        internalTx.Data = null; //cleanup secret data
                        break;
                    case Sp8deTransactionType.AggregatedReveal:
                        internalTx.Type = Sp8deTransactionType.InternalReveal;
                        break;
                    default:
                        throw new ArgumentException(nameof(type));
                }

                innerItems.Add(internalTx);
            }

            var tx = transactionService.GenerateNewTransaction(innerItems, type, dependsOn);

            return tx;
        }
    }
}