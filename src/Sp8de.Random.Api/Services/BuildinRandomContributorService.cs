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
        private readonly ICryptoService cryptoService;
        private readonly IKeySecret keySecret;

        public BuildinRandomContributorService(IRandomNumberGenerator random, IGenericDataStorage storage, ICryptoService cryptoService, IKeySecretManager keySecretManager)
        {
            this.random = random;
            this.storage = storage;
            this.cryptoService = cryptoService;
            this.keySecret = keySecretManager.Generate();
        }

        public async Task<SignedItem> GenerateCommit(string nonce)
        {
            var revealItem = new RevealItem()
            {
                Type = UserType.Validator,
                Seed = random.NextLong().ToString(),
                Nonce = nonce ?? DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress
            };

            revealItem.Sign = cryptoService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            await storage.Add(revealItem.Sign, revealItem);

            return revealItem.ToCommitItem();
        }

        public Task<RevealItem> Reveal(SignedItem item)
        {
            return storage.Get<RevealItem>(item.Sign);
        }
    }
}