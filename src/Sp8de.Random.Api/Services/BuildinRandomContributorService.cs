using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.Random.Api.Models;
using System;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Services
{
    public class BuildinRandomContributorService : IRandomContributorService
    {
        private readonly IRandomNumberGenerator random;
        private readonly IGenericDataStorage storage;
        private readonly ISignService signService;
        private readonly IKeySecret keySecret;

        public BuildinRandomContributorService(IRandomNumberGenerator random, IGenericDataStorage storage, ISignService signService, IKeySecretManager keySecretManager)
        {
            this.random = random;
            this.storage = storage;
            this.signService = signService;
            this.keySecret = keySecretManager.Generate();
        }

        public async Task<SignedItem> GenerateCommit(string nonce)
        {
            var revealItem = new RevealItem()
            {
                Type = UserType.Validator,
                Seed = random.NextLong(),
                Nonce = nonce ?? DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress
            };

            revealItem.Sign = signService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            await storage.Add(revealItem.Sign, revealItem);

            return revealItem.ToCommitItem();
        }

        public Task<RevealItem> Reveal(SignedItem item)
        {
            return storage.Get<RevealItem>(item.Sign);
        }
    }
}