using Sp8de.Common.Enums;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IWalletService
    {
        Task ProcessPayment(Guid userId, decimal amount, WalletTransactionType type);
    }
}
