using Sp8de.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Models
{
    public class DashboardTransactionsViewModel
    {
        public List<PaymentTransactionInfo> Items { get; set; }
        public bool HasTransactions => Items != null && Items.Count > 0;
    }
}
