using Sp8de.Common.Interfaces;
using Sp8de.Random.Api.Models;
using Sp8de.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Services
{
    public class SharedSeedService : ISharedSeedService
    {
        private readonly IDataStorage dataStorage;
        private readonly ISignService signService;
        private readonly IRandomNumberGenerator random;

        public SharedSeedService(IDataStorage dataStorage, ISignService signService, IRandomNumberGenerator random)
        {
            this.dataStorage = dataStorage;
            this.signService = signService;
            this.random = random;
        }

        public void Commit(IList<CommitItem> items)
        {

        }

        public void Reveal(IList<RevealItem> items)
        {
            foreach (var item in items)
            {
                if (!signService.VerifySignature($"${item.PubKey};${item.Salt};${item.Seed}", item.Sign, item.PubKey))
                {
                    throw new ArgumentException($"Invalid signature for {item.PubKey}");
                }
            }

            var sharedSeed =  RandomHelpers.CreateSharedSeed(items.Select(x => x.Seed).AsEnumerable());

            
        }
    }
}