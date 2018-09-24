using System.Threading.Tasks;
using Sp8de.Common.BlockModels;

namespace Sp8de.Common.Interfaces
{

    public interface ISp8deTransactionNodeService
    {
        Task<Sp8deTransaction> AddTransaction(CreateTransactionRequest request);
    }
}