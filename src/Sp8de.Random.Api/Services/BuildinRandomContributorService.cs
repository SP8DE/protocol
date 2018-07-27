using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.Random.Api.Models;
using System;

namespace Sp8de.Random.Api.Services
{
    public class BuildinRandomContributorService : IRandomContributorService
    {
        private readonly IRandomNumberGenerator random;
        private readonly IDataStorage storage;
        private readonly ISignService signService;
        private readonly IKeySecret keySecret;

        public BuildinRandomContributorService(IRandomNumberGenerator random, IDataStorage storage, ISignService signService, IKeySecretManager keySecretManager)
        {
            this.random = random;
            this.storage = storage;
            this.signService = signService;
            this.keySecret = keySecretManager.Generate();
        }

        public CommitItem GenerateCommit(string nonce)
        {
            var revealItem = new RevealItem()
            {
                Type = UserType.Validator,
                Seed = random.NextLong(),
                Nonce = nonce ?? DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress
            };

            revealItem.Sign = signService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            storage.Add(revealItem);

            return revealItem.ToCommitItem();
        }

        public RevealItem Reveal(CommitItem item)
        {
            return new RevealItem()
            {
                Type = UserType.Validator
            };
        }
    }
}