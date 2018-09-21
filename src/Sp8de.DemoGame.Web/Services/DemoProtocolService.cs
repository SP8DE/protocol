using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.Common.Utils;
using Sp8de.IpfsStorageService;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    //temp
    public class DemoProtocolService : IChaosProtocolService
    {
        private readonly IRandomNumberGenerator random;
        private readonly IGenericDataStorage storage;
        private readonly ICryptoService cryptoService;
        private readonly IpfsFileStorageService ipfs;
        private readonly IKeySecret keySecret;

        public DemoProtocolService(ChaosProtocolConfig config, IRandomNumberGenerator random, IGenericDataStorage storage, ICryptoService cryptoService, IKeySecretManager keySecretManager, IpfsFileStorageService ipfs)
        {
            this.random = random;
            this.storage = storage;
            this.cryptoService = cryptoService;
            this.ipfs = ipfs;
            this.keySecret = keySecretManager.LoadKeySecret(config.ApiSecret);
        }

        public async Task<ProtocolTransaction> CreateTransaction(List<SignedItem> items, ChaosProtocolSettings settings)
        {
            var id = TxIdHelper.GenerateId();

            var revealItem = new RevealItem()
            {
                Type = UserType.Validator,
                Seed = random.NextLong().ToString(),
                Nonce = DateTime.UtcNow.Ticks.ToString(),
                PubKey = keySecret.PublicAddress.ToLowerInvariant()
            };

            revealItem.Sign = cryptoService.SignMessage(revealItem.ToString(), keySecret.PrivateKey);

            await storage.Add(revealItem.Sign, revealItem);

            items.Add(revealItem.ToCommitItem());

            var tx = new ProtocolTransaction()
            {
                Id = id,
                Signer = keySecret.PublicAddress.ToLowerInvariant(),
                Items = items
            };

            await AddAnchors(tx);

            await storage.Add(id, tx);

            return tx;
        }

        private async Task AddAnchors(ProtocolTransaction tx)
        {
            if (ipfs.IsActive)
            {
                var rs = await ipfs.Add(tx.Id, tx);

                tx.Anchor = new Anchor()
                {
                    Type = "ipfs",
                    Data = rs.Id,
                    Timestamp = DateConverter.UtcNow
                };
            }
        }

        public async Task<ProtocolTransaction> RevealTransaction(string transactionId, List<RevealItem> items)
        {
            var tx = await storage.Get<ProtocolTransaction>(transactionId);

            var commitItem = tx.Items.First(x => x.PubKey == tx.Signer);

            items.Add(await storage.Get<RevealItem>(commitItem.Sign));

            foreach (var revealItem in items)
            {
                if (!cryptoService.VerifySignature(revealItem.ToString(), revealItem.Sign, revealItem.PubKey))
                {
                    throw new ArgumentException($"Invalid signature for {revealItem.PubKey}");
                };
            }

            var finishTx = new ProtocolTransaction()
            {
                Id = TxIdHelper.GenerateId(),
                DependsOn = transactionId,
                Signer = keySecret.PublicAddress.ToLowerInvariant(),
                Items = items.Select(x => (SignedItem)x).ToList()
            };

            await AddAnchors(finishTx);

            await storage.Add(finishTx.Id, finishTx);

            return finishTx;
        }
    }
}
