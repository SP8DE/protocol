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

namespace Sp8de.Services.Explorer
{
    public class Sp8deBlockProducer : ISp8deBlockProducer
    {
        private readonly ISp8deTransactionStorage transactionStorage;
        private readonly ISp8deBlockStorage blockStorage;
        private readonly ISignService signService;
        private readonly IKeySecret key;

        public Sp8deBlockProducer(ISp8deTransactionStorage transactionStorage, ISp8deBlockStorage blockStorage, IKeySecret key)
        {
            this.transactionStorage = transactionStorage;
            this.blockStorage = blockStorage;
            this.key = key;
            this.signService = new EthSignService();
        }

        public Sp8deBlock GenerateNewBlock(IReadOnlyList<Sp8deTransaction> list, Sp8deBlock prevBlock)
        {
            var block = new Sp8deBlock()
            {
                Id = prevBlock.Id + 1,
                PreviousHash = prevBlock.Hash,
                Timestamp = DateConverter.UtcNow,
                Transactions = list.Select(x => x.Id).ToList(),
                Signer = key.PublicAddress,
                /*Anchors = new List<Anchor>() {
                    new Anchor(){
                        Type = "IPFS",
                        Data = "QmPTptErGpze3kzx84nyoEpYyK3caWdUThRbcpi2tYdCmi",
                        Timestamp = DateConverter.UtcNow
                    }
                }*/
            };

            block.TransactionRoot = CalculateTransactionRootHash(list);

            var blockContent = block.GeteDataForSing();

            block.Signature = signService.SignMessage(blockContent, key.PrivateKey);

            block.Hash = HexConverter.ToHex(signService.CalculateHash(Encoding.UTF8.GetBytes(block.Signature)));

            return block;
        }

        public async Task<Sp8deBlock> Produce(int limit = 1)
        {
            var block = await blockStorage.GetLatestBlock() ?? new Sp8deBlock();

            for (int i = 0; i < limit; i++)
            {
                var transactions = await transactionStorage.GetPending(new Random().Next(0, 200));


                //block = blockService.GenerateNewBlock(transactions, block);

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
            }

            return block;
        }

        public string CalculateTransactionRootHash(IReadOnlyList<Sp8deTransaction> list)
        {
            var trie = new PatriciaTrie();

            foreach (var item in list)
            {               
                trie.Put(Encoding.UTF8.GetBytes(item.Id), Encoding.UTF8.GetBytes(item.InternalRoot /*item.Signature*/)); //TODO
            }

            var outputBytes = trie.GetRootHash();
            return HexConverter.ToHex(outputBytes);
        }
    }

}
