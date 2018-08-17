using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using System;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    public class CasinoRandomService : IRandomContributorService
    {
        private readonly IRandomNumberGenerator random;
        private readonly IGenericDataStorage storage;
        private readonly ISignService signService;
        private readonly IKeySecret keySecret;

        public CasinoRandomService(IRandomNumberGenerator random, IGenericDataStorage storage, ISignService signService, IKeySecretManager keySecretManager)
        {
            this.random = random;
            this.storage = storage;
            this.signService = signService;
            this.keySecret = keySecretManager.Generate();
        }

        public async Task<CommitItem> GenerateCommit(string salt)
        {
            var revealItem = new RevealItem()
            {
                Type = UserType.Requester,
                Seed = random.NextLong(),
                Nonce = salt ?? DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress
            };

            revealItem.Sign = signService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            await storage.Add(revealItem.Sign, revealItem);

            return revealItem.ToCommitItem();
        }

        public Task<RevealItem> Reveal(CommitItem item)
        {
            return storage.Get<RevealItem>(item.Sign);
        }
    }
}
