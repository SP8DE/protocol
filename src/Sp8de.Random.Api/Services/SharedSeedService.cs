using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.Common.Utils;
using Sp8de.EthServices;
using Sp8de.Random.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Services
{
    public class SharedSeedService //: ISharedSeedService
    {
        private readonly IDataStorage dataStorage;
        private readonly ICryptoService cryptoService;
        private readonly IRandomContributorService contributorService;
        private readonly ISp8deTransactionNodeService transactionNode;

        public SharedSeedService(IDataStorage dataStorage, ICryptoService cryptoService, IRandomContributorService contributorService, ISp8deTransactionNodeService transactionNode)
        {
            this.dataStorage = dataStorage;
            this.cryptoService = cryptoService;
            this.contributorService = contributorService;
            this.transactionNode = transactionNode;
        }

        public async Task<SharedSeedData> AggregatedCommit(List<CommitItem> items)
        {
            var seedData = new SharedSeedData()
            {
                Id = TxIdHelper.GenerateId(),
                MetaData = new SharedSeedMetaData()
                {
                    Expire = DateTime.UtcNow.AddMonths(5),
                    TimeStamp = DateTime.UtcNow
                },
                Items = new List<SeedItem>()
            };          
            
            seedData.Items.AddRange(items.Select(x => new SeedItem() { PubKey = x.PubKey }).AsEnumerable());

            var contributorCommintItem = contributorService.GenerateCommit(DateTime.UtcNow.Ticks.ToString()).GetAwaiter().GetResult();
            seedData.Items.Add(new SeedItem() { PubKey = contributorCommintItem.PubKey });

            dataStorage.Add(seedData);

            var transaction = await transactionNode.AddTransaction(new CreateTransactionRequest() { });

            return seedData;
        }

        public RevealSharedSeedData Reveal(string sharedSeedId, IList<RevealItem> items)
        {
            foreach (var item in items)
            {
                if (!cryptoService.VerifySignature(item.ToString(), item.Sign, item.PubKey))
                {
                    throw new ArgumentException($"Invalid signature for {item.PubKey}");
                }
            }

            var commit = items.Single(x => x.PubKey == "TODO").ToCommitItem();

            var commintItems = dataStorage.Get(sharedSeedId);

            var contributorReveal = contributorService.Reveal(commit).GetAwaiter().GetResult();

            var sharedSeed = SharedSeedGenerator.CreateSharedSeed(items.Select(x => x.Seed).AsEnumerable());

            var list = new List<RevealItem>();
            list.AddRange(items);
            list.Add(contributorReveal);

            return new RevealSharedSeedData()
            {
                Id = sharedSeedId,
                Items = list,
                SharedSeed = sharedSeed.seedArray.ToList()
            };
        }

        public RevealSharedSeedData Get(string sharedSeedId)
        {
            return new RevealSharedSeedData()
            {
                Id = sharedSeedId,
                //Items = list,
                //SharedSeed = sharedSeed
            };
        }
    }
}