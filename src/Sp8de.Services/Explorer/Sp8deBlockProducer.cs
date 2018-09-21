using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Utils;
using Stratis.Patricia;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Services.Explorer
{
    public class Sp8deBlockProducer : ISp8deBlockProducer
    {
        private readonly ISp8deTransactionStorage transactionStorage;
        private readonly ISp8deBlockStorage blockStorage;
        private readonly ICryptoService cryptoService;

        public Sp8deBlockProducer(ISp8deTransactionStorage transactionStorage, ISp8deBlockStorage blockStorage, ICryptoService cryptoService)
        {
            this.transactionStorage = transactionStorage;
            this.blockStorage = blockStorage;
            this.cryptoService = cryptoService;
        }

        public Sp8deBlock GenerateNewBlock(IReadOnlyList<Sp8deTransaction> list, Sp8deBlock prevBlock, IKeySecret producerKey)
        {
            var block = new Sp8deBlock()
            {
                Id = prevBlock.Id + 1,
                PreviousHash = prevBlock.Hash,
                Timestamp = DateConverter.UtcNow,
                Transactions = list.Select(x => x.Id).ToList(),
                Signer = producerKey.PublicAddress
            };

            block.TransactionRoot = CalculateTransactionRootHash(list);

            var blockContent = block.GeteDataForSing();

            block.Signature = cryptoService.SignMessage(blockContent, producerKey.PrivateKey);

            block.Hash = HexConverter.ToHex(cryptoService.CalculateHash(Encoding.UTF8.GetBytes(block.Signature)));

            return block;
        }

        public async Task<Sp8deBlock> Produce(IKeySecret producerKey)
        {
            var block = await blockStorage.GetLatestBlock() ?? new Sp8deBlock();

            var transactions = await transactionStorage.GetPending(new Random().Next(1, 200));

            if (transactions.Count == 0 && DateConverter.UtcNow - block.Timestamp < (60 * 15 * 1000)) //skip empty blocks
            {
                return null;
            }

            block = GenerateNewBlock(transactions, block, producerKey);

            await blockStorage.Add(block);

            foreach (var item in transactions)
            {
                item.Status = Sp8deTransactionStatus.Confirmed;
                item.Meta = new TransactionMeta()
                {
                    BlockId = block.Id
                };
            }

            await transactionStorage.Update(transactions);

            return block;
        }

        public string CalculateTransactionRootHash(IReadOnlyList<Sp8deTransaction> list)
        {
            var trie = new PatriciaTrie();

            foreach (var item in list)
            {
                trie.Put(Encoding.UTF8.GetBytes(item.Id), Encoding.UTF8.GetBytes(item.InternalRoot /*item.Signature*/));
            }

            var outputBytes = trie.GetRootHash();
            return HexConverter.ToHex(outputBytes);
        }
    }

}
