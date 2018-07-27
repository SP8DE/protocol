using System;
using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;

namespace Sp8de.DemoGame.Web.Services
{
    public class CasinoRandomService : IRandomContributorService
    {
        private readonly IRandomNumberGenerator random;
        private readonly IDataStorage storage;
        private readonly ISignService signService;
        private readonly IKeySecret keySecret;

        public CasinoRandomService(IRandomNumberGenerator random, IDataStorage storage, ISignService signService, IKeySecretManager keySecretManager)
        {
            this.random = random;
            this.storage = storage;
            this.signService = signService;
            this.keySecret = keySecretManager.Generate();
        }

        public CommitItem GenerateCommit(string salt)
        {
            var revealItem = new RevealItem()
            {
                Type = UserType.Requester,
                Seed = random.NextLong(),
                Nonce = salt ?? DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress
            };

            revealItem.Sign = signService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            storage.Add(revealItem);

            return revealItem.ToCommitItem();
        }

        public RevealItem Reveal(CommitItem item)
        {
            throw new NotImplementedException();
        }
    }
}
