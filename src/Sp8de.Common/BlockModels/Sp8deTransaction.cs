using Sp8de.Common.Interfaces;
using System.Collections.Generic;
using System.Text;
using System.Linq;

namespace Sp8de.Common.BlockModels
{
    public class Sp8deTransaction : IEntity
    {
        public string Id { get; set; }
        public Sp8deTransactionType Type { get; set; }
        public string Signer { get; set; }
        public string Signature { get; set; }
        public string Requester { get; set; }
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

        public byte[] GetBytes()
        {
            return Encoding.UTF8.GetBytes($"{this.Type};{this.Timestamp};{this.InternalRoot};{this.Signer ?? ""};{this.DependsOn ?? ""};{this.InputData?.Hash ?? ""};{this.OutputData?.Hash ?? ""}");
            //{string.Join('|', InternalTransactions.Select(x => x.Sign))}
        }

        /*public Sp8deTransaction()
        {
            Anchors = new List<Anchor>();
            InternalTransactions = new List<InternalTransaction>();
        }*/
    }
}
