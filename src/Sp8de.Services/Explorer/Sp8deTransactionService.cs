using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
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
    public class Sp8deTransactionService
    {
        private readonly ISignService signService;
        private readonly Sp8deNodeConfig config;

        public Sp8deTransactionService(Sp8deNodeConfig config)
        {
            this.signService = new EthSignService();
            this.config = config;
        }

        public string CalculateHash(byte[] inputBytes)
        {
            byte[] outputBytes = signService.CalculateHash(inputBytes);
            return HexConverter.ToHex(outputBytes);
        }

        public (string hash, byte[] bytes) CalculateTransactionHash(Sp8deTransaction transaction)
        {
            byte[] outputBytes = signService.CalculateHash(transaction.GetBytes());
            return (HexConverter.ToHex(outputBytes), outputBytes);
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
            byte[] outputBytes = signService.CalculateHash(transaction.GetBytes());
            return (HexConverter.ToHex(outputBytes), outputBytes);
        }
    }
}
