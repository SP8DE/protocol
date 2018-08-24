using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.EthServices;
using System;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    public class DemoGameConfig
    {
        public string PrivateKey { get; set; }
    }

    public class DemoGameRandomService : IRandomContributorService
    {
        private readonly IRandomNumberGenerator random;
        private readonly IGenericDataStorage storage;
        private readonly ISignService signService;
        private readonly IKeySecret keySecret;

        public DemoGameRandomService(DemoGameConfig config, IRandomNumberGenerator random, IGenericDataStorage storage, ISignService signService, IKeySecretManager keySecretManager)
        {
            this.random = random;
            this.storage = storage;
            this.signService = signService;
            this.keySecret = keySecretManager.LoadKeySecret(config.PrivateKey);
        }

        public async Task<SignedItem> GenerateCommit(string salt)
        {
            var revealItem = new RevealItem()
            {
                Type = UserType.Requester,
                Seed = random.NextLong().ToString(),
                Nonce = salt ?? DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress.ToLowerInvariant()
            };

            revealItem.Sign = signService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            await storage.Add(revealItem.Sign, revealItem);

            return revealItem.ToCommitItem();
        }

        public async Task<RevealItem> Reveal(SignedItem item)
        {
            var revealItem = await storage.Get<RevealItem>(item.Sign);

            if (!signService.VerifySignature(revealItem.ToString(), revealItem.Sign, revealItem.PubKey))
            {
                throw new ArgumentException("Invalid signature");
            };

            return revealItem;
        }
    }
}
