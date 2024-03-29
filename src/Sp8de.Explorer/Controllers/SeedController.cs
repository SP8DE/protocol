﻿using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.EthServices;
using Sp8de.Services;
using Sp8de.Services.Protocol;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Controllers
{
    [Route("api/seed")]
    [ApiController]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class SeedController : Controller
    {
        private readonly ICryptoService cryptoService;
        private readonly IKeySecret[] keys;
        private readonly ISp8deTransactionStorage storage;
        private readonly Sp8deTransactionNodeService transactionService;

        public SeedController(ISp8deTransactionStorage storage, ICryptoService cryptoService, Sp8deNodeConfig config)
        {
            if (config == null || config.PrivateKeys == null)
            {
                throw new ArgumentNullException(nameof(Sp8deNodeConfig));
            }

            this.keys = config.PrivateKeys.Select(x => EthKeySecret.Load(x)).ToArray();
            this.storage = storage;
            this.cryptoService = cryptoService;
            this.transactionService = new Sp8deTransactionNodeService(cryptoService, storage, Enumerable.Empty<IExternalAnchorService>());
        }

        [HttpGet("transactions")]
        public async Task<ActionResult> Transactions(int limit = 100)
        {
            Stopwatch sw = new Stopwatch();
            sw.Start();

            Parallel.ForEach(Enumerable.Repeat(1, limit), async (x) =>
            {
                try
                {
                    int secret = new CRNGRandom().NextInt();
                    var tx1 = await CreateTransaction(secret, Sp8deTransactionType.AggregatedCommit);
                    var tx2 = await CreateTransaction(secret, Sp8deTransactionType.AggregatedReveal, tx1.Id);
                }
                catch (Exception e)
                {

                }
            });

            sw.Stop();

            return Ok(sw.ElapsedMilliseconds);
        }

        private async Task<Sp8deTransaction> CreateTransaction(int secret, Sp8deTransactionType type, string dependsOn = null)
        {
            var innerItems = new List<InternalTransaction>();
            for (int i = 0; i < keys.Length; i++)
            {
                var key = keys[i];

                var internalTx = new InternalTransaction()
                {
                    Nonce = ((secret + i) * 3).ToString(),
                    From = key.PublicAddress,
                    Data = (secret / (i + 3) + i).ToString()
                };

                internalTx.Sign = cryptoService.SignMessage(internalTx.GetDataForSign(), key.PrivateKey);

                switch (type)
                {
                    case Sp8deTransactionType.AggregatedCommit:
                        internalTx.Type = Sp8deTransactionType.InternalContributor + i;
                        internalTx.Data = null; //cleanup secret data
                        break;
                    case Sp8deTransactionType.AggregatedReveal:
                        internalTx.Type = Sp8deTransactionType.InternalContributor + i;
                        break;
                    default:
                        throw new ArgumentException(nameof(type));
                }

                innerItems.Add(internalTx);
            }

            var tx = await transactionService.AddTransaction(new CreateTransactionRequest()
            {
                DependsOn = dependsOn,
                InnerTransactions = innerItems,
                Type = type
            });

            return tx;
        }
    }
}