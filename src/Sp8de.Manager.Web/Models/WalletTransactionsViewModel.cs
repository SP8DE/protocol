using System.Collections.Generic;

namespace Sp8de.Manager.Web.Models
{
    public class WalletTransactionsViewModel
    {
        public List<WalletTransactionViewModel> Transactions { get; set; }
        public bool HasTransactions => Transactions?.Count > 0;
    }
}