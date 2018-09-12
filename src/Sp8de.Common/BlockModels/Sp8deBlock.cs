using Sp8de.Common.Interfaces;
using System.Collections.Generic;

namespace Sp8de.Common.BlockModels
{
    public class Sp8deBlock : IEntity<long>
    {
        public long Id { get; set; }
        public long ChainId { get; set; }
        public string Hash { get; set; }
        public string PreviousHash { get; set; }
        public string TransactionRoot { get; set; }
        public string Signer { get; set; }
        public string Signature { get; set; }
        public long Timestamp { get; set; }
        public int TransactionsCount => Transactions?.Count ?? 0;
        public IList<string> Transactions { get; set; }
        public IList<Anchor> Anchors { get; set; }

        public string GeteDataForSing()
        {
            return $"{this.Id};{this.ChainId};{this.Timestamp};{this.PreviousHash ?? ""};{this.TransactionRoot};{this.Signer};{this.TransactionsCount};{string.Join(';', this.Transactions)}";
        }
    }
}
