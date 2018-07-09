using System;

namespace Sp8de.Manager.Web.Models
{
    public class WalletTransactionViewModel
    {
        public string Currency { get; internal set; }
        public decimal Amount { get; internal set; }
        public DateTime DateCreated { get; internal set; }
        public string Address { get; internal set; }
        public string Hash { get; internal set; }
    }

}