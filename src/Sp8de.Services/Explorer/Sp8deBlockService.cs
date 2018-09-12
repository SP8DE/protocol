using Sp8de.Common.BlockModels;
using Sp8de.Common.Utils;
using Sp8de.EthServices;
using Stratis.Patricia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Sp8de.Services.Explorer
{
    //temp
    public class Sp8deBlockService
    {
        private readonly IHasher hasher;
        private readonly EthSignService signService;
        private readonly Sp8deNodeConfig config;

        public Sp8deBlockService(Sp8deNodeConfig config)
        {
            this.hasher = new Keccak256Hasher();
            this.signService = new EthSignService();
            this.config = config;
        }

        public string CalculateHash(byte[] inputBytes)
        {
            byte[] outputBytes = hasher.Hash(inputBytes);
            return HexConverter.ToHex(outputBytes);
        }

        public (string hash, byte[] bytes) CalculateTransactionHash(Sp8deTransaction transaction)
        {
            byte[] inputBytes = Encoding.UTF8.GetBytes($"{transaction.Type};{transaction.Timestamp};{transaction.InternalRoot};{transaction.Signer ?? ""};{transaction.DependsOn ?? ""};{transaction.InputData?.Hash ?? ""};{transaction.OutputData?.Hash ?? ""}");
            byte[] outputBytes = hasher.Hash(inputBytes);
            return (HexConverter.ToHex(outputBytes), outputBytes);
        }

        public Sp8deBlock GenerateNewBlock(IReadOnlyList<Sp8deTransaction> list, Sp8deBlock prevBlock)
        {
            var block = new Sp8deBlock()
            {
                Id = prevBlock.Id + 1,
                PreviousHash = prevBlock.Hash,
                Timestamp = DateConverter.UtcNow,
                Transactions = list.Select(x => x.Id).ToList(),
                Signer = config.Key.PublicAddress,
                Anchors = new List<Anchor>() {
                    new Anchor(){
                        Type = "IPFS",
                        Data = "QmPTptErGpze3kzx84nyoEpYyK3caWdUThRbcpi2tYdCmi",
                        Timestamp = DateConverter.UtcNow
                    }
                }
            };

            block.TransactionRoot = CalculateTransactionRootHash(list);

            var blockContent = block.GeteDataForSing();

            block.Signature = signService.SignMessage(blockContent, config.Key.PrivateKey);

            block.Hash = CalculateHash(Encoding.UTF8.GetBytes(block.Signature));

            return block;
        }

        public Sp8deTransaction GenerateNewTransaction(IList<InternalTransaction> inner, Sp8deTransactionType transactionType, string dependsOn = null)
        {
            var tx = new Sp8deTransaction()
            {
                Timestamp = DateConverter.UtcNow,
                Expiration = DateConverter.UtcNow,
                CompleatedAt = DateConverter.UtcNow,
                DependsOn = dependsOn,
                InputData = new TransactionData()
                {
                    Items = new Dictionary<string, IList<string>> {
                        { "randomType", new List<string>{ "Dice" } }
                    }
                },
                Type = transactionType,
                Status = Sp8deTransactionStatus.New
            };

            PopulateInternalTransactionHash(inner);

            tx.InternalTransactions = inner;

            tx.Anchors.Add(new Anchor()
            {
                Type = "IPFS",
                Data = "QmPTptErGpze3kzx84nyoEpYyK3caWdUThRbcpi2tYdCmi",
                Timestamp = DateConverter.UtcNow,
            });

            tx.InternalRoot = CalculateInternalTransactionRootHash(inner);

            tx.InputData.Hash = CalculateHash(tx.InputData.GetBytes());

            if (transactionType == Sp8deTransactionType.AggregatedReveal)
            {
                var (seedArray, seedHash) = SharedSeedGenerator.CreateSharedSeed(inner.Select(x => x.Data));

                tx.OutputData = new TransactionData()
                {
                    Items = new Dictionary<string, IList<string>> {
                        { "sharedSeedArray", seedArray.Select(x=>x.ToString()).ToArray() },
                        { "sharedSeedHash", new List<string> { seedHash } }
                    }
                };
                tx.OutputData.Hash = CalculateHash(tx.OutputData.GetBytes());
            }

            tx.Id = CalculateTransactionHash(tx).hash;

            return tx;
        }

        public string CalculateTransactionRootHash(IReadOnlyList<Sp8deTransaction> list)
        {
            var trie = new PatriciaTrie();

            foreach (var item in list)
            {
                var hash = CalculateTransactionHash(item);
                trie.Put(hash.bytes, Encoding.UTF8.GetBytes(item.InternalRoot /*item.Signature*/)); //TODO
            }

            var outputBytes = trie.GetRootHash();
            return HexConverter.ToHex(outputBytes);
        }

        public void PopulateInternalTransactionHash(IList<InternalTransaction> list)
        {
            if (list == null && list.Count == 0)
                return;

            foreach (var item in list)
            {
                item.Hash = CalculateInternalTransactionHash(item).hash;
            }
        }

        public string CalculateInternalTransactionRootHash(IList<InternalTransaction> list)
        {
            if (list == null && list.Count == 0)
                return null;

            var trie = new PatriciaTrie();

            for (int i = 0; i < list.Count; i++)
            {
                var item = list[i];
                trie.Put(BitConverter.GetBytes(i), Encoding.UTF8.GetBytes(item.Sign));
            }

            var outputBytes = trie.GetRootHash();
            return HexConverter.ToHex(outputBytes);
        }

        public (string hash, byte[] bytes) CalculateInternalTransactionHash(InternalTransaction transaction)
        {
            byte[] inputBytes = Encoding.UTF8.GetBytes($"{transaction.Type};{transaction.From};{transaction.Nonce};{ transaction.Sign}");
            byte[] outputBytes = hasher.Hash(inputBytes);
            return (HexConverter.ToHex(outputBytes), outputBytes);
        }
    }

}
