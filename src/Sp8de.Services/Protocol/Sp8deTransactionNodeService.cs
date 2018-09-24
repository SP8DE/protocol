using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Utils;
using Sp8de.EthServices;
using Stratis.Patricia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Services.Protocol
{
    public class Sp8deTransactionNodeService : ISp8deTransactionNodeService
    {
        private readonly ICryptoService cryptoService;
        private readonly ISp8deTransactionStorage transactionStorage;
        private readonly IEnumerable<IExternalAnchorService> anchorServices;

        public Sp8deTransactionNodeService(ICryptoService cryptoService, ISp8deTransactionStorage transactionStorage, IEnumerable<IExternalAnchorService> anchorServices)
        {
            this.cryptoService = cryptoService;
            this.transactionStorage = transactionStorage;
            this.anchorServices = anchorServices;
        }

        public async Task<Sp8deTransaction> AddTransaction(CreateTransactionRequest request)
        {
            var transaction = new Sp8deTransaction()
            {
                Timestamp = DateConverter.UtcNow,
                Expiration = DateConverter.UtcNow,
                CompleatedAt = DateConverter.UtcNow,
                DependsOn = request.DependsOn,
                Anchors = new List<Anchor>(),
                Type = request.Type,
                Status = Sp8deTransactionStatus.New
            };

            if (request.InputData != null)
            {
                transaction.InputData = new TransactionData()
                {
                    Items = request.InputData
                };

                transaction.InputData.Hash = CalculateHash(transaction.InputData.GetBytes());
            }

            PopulateInternalTransactionHash(request.InnerTransactions);

            transaction.InternalTransactions = request.InnerTransactions;

            transaction.InternalRoot = CalculateInternalTransactionRootHash(request.InnerTransactions);

            if (request.Type == Sp8deTransactionType.AggregatedReveal)
            {
                var (seedArray, seedHash) = SharedSeedGenerator.CreateSharedSeed(request.InnerTransactions.Select(x => x.Data));

                transaction.OutputData = new TransactionData()
                {
                    Items = new Dictionary<string, IList<string>> {
                        { "sharedSeedArray", seedArray.Select(x=>x.ToString()).ToArray() },
                        { "sharedSeedHash", new List<string> { seedHash } }
                    }
                };
                transaction.OutputData.Hash = CalculateHash(transaction.OutputData.GetBytes());
            }

            transaction.Id = CalculateTransactionHash(transaction).hash;

            await AddAnchors(transaction);

            await transactionStorage.Add(transaction);

            return transaction;
        }

        private async Task AddAnchors(Sp8deTransaction transaction)
        {
            if (anchorServices != null)
            {
                transaction.Anchors = transaction.Anchors ?? new List<Anchor>();

                var anchors = await Task.WhenAll(anchorServices.Select(x => x.Add(transaction)));

                foreach (var anchor in anchors)
                {
                    transaction.Anchors.Add(anchor);
                }
            }
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

        public string CalculateHash(byte[] inputBytes)
        {
            byte[] outputBytes = cryptoService.CalculateHash(inputBytes);
            return HexConverter.ToHex(outputBytes);
        }

        public (string hash, byte[] bytes) CalculateTransactionHash(Sp8deTransaction transaction)
        {
            byte[] outputBytes = cryptoService.CalculateHash(transaction.GetBytes());
            return (HexConverter.ToHex(outputBytes), outputBytes);
        }

        public (string hash, byte[] bytes) CalculateInternalTransactionHash(InternalTransaction transaction)
        {
            byte[] outputBytes = cryptoService.CalculateHash(transaction.GetBytes());
            return (HexConverter.ToHex(outputBytes), outputBytes);
        }
    }
}
