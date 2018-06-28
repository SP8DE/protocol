using Sp8de.Common.Models;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IPaymentTransactionService
    {
        Task<PaymentTransactionInfo> ProcessCallback(ProcessPaymentTransaction request);
    }
}
