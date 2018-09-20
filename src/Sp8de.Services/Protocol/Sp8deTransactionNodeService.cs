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
        private readonly Sp8deNodeConfig config;

        public Sp8deTransactionNodeService(Sp8deNodeConfig config, ICryptoService cryptoService, ISp8deTransactionStorage transactionStorage, IEnumerable<IExternalAnchorService> anchorServices)
        {
            this.config = config;
            this.cryptoService = cryptoService;
            this.transactionStorage = transactionStorage;
            this.anchorServices = anchorServices;
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

        public async Task<Sp8deTransaction> AddTransaction(CreateTransactionRequest request)
        {
            var tx = new Sp8deTransaction()
            {
                Timestamp = DateConverter.UtcNow,
                Expiration = DateConverter.UtcNow,
                CompleatedAt = DateConverter.UtcNow,
                DependsOn = request.DependsOn,
                Anchors = new List<Anchor>(),
                InputData = new TransactionData()
                {
                    Items = new Dictionary<string, IList<string>> {
                        { "randomType", new List<string>{ "Dice" } }
                    }
                },
                Type = request.Type,
                Status = Sp8deTransactionStatus.New
            };

            PopulateInternalTransactionHash(request.InnerTransactions);

            tx.InternalTransactions = request.InnerTransactions;

            tx.InternalRoot = CalculateInternalTransactionRootHash(request.InnerTransactions);

            tx.InputData.Hash = CalculateHash(tx.InputData.GetBytes());

            if (request.Type == Sp8deTransactionType.AggregatedReveal)
            {
                var (seedArray, seedHash) = SharedSeedGenerator.CreateSharedSeed(request.InnerTransactions.Select(x => x.Data));

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

            await AddAnchors(tx);

            await transactionStorage.Add(tx);

            return tx;
        }

        private async Task AddAnchors(Sp8deTransaction transaction)
        {
            if (anchorServices != null)
            {
                transaction.Anchors = transaction.Anchors ?? new List<Anchor>();

                var anckors = await Task.WhenAll(anchorServices.Select(x => x.Add(transaction)));

                foreach (var anckor in anckors)
                {
                    transaction.Anchors.Add(anckor);
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

        public (string hash, byte[] bytes) CalculateInternalTransactionHash(InternalTransaction transaction)
        {
            byte[] outputBytes = cryptoService.CalculateHash(transaction.GetBytes());
            return (HexConverter.ToHex(outputBytes), outputBytes);
        }
    }
}
