using System.Collections.Generic;
using System.Threading.Tasks;
using Sp8de.Common.BlockModels;

namespace Sp8de.Common.Interfaces
{
    public class CreateTransactionRequest
    {
        public Sp8deTransactionType Type { get; set; }
        public IList<InternalTransaction> InnerTransactions { get; set; }
        public string DependsOn { get; set; }
    }

    public interface ISp8deTransactionNodeService
    {
        Task<Sp8deTransaction> AddTransaction(CreateTransactionRequest request);
    }
}