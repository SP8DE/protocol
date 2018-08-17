using Sp8de.Common.Interfaces;
using System.Collections.Generic;

namespace Sp8de.Common.BlockModels
{

    public class Sp8deTransaction : IEntity
    {
        public string Id { get; set; }
        public Sp8deTransactionType Type { get; set; }
        public string Signer { get; set; }
        public string Signature { get; set; }
        public Sp8deTransactionStatus Status { get; set; }
        public string DependsOn { get; set; }

        public long Timestamp { get; set; }
        public long Expiration { get; set; }
        public long CompleatedAt { get; set; }

        public long Fee { get; set; }

        public IList<Anchor> Anchors { get; set; }

        public TransactionData InputData { get; set; }
        public TransactionData OutputData { get; set; }

        public string InternalRoot { get; set; }

        public IList<InternalTransaction> InternalTransactions { get; set; }

        public TransactionMeta Meta { get; set; }

        public Sp8deTransaction()
        {
            Anchors = new List<Anchor>();
            InternalTransactions = new List<InternalTransaction>();
        }
    }
}
