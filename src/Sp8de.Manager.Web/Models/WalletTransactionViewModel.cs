using Sp8de.Common.Enums;
using Sp8de.Common.Models;
using System;

namespace Sp8de.Manager.Web.Models
{
    public class WalletTransactionViewModel
    {
        public WalletTransactionType Type { get; set; }
        public WalletTransactionStatus Status { get; set; }
        public Currency Currency { get; set; }
        public decimal Amount { get; set; }
        public DateTime DateCreated { get; set; }
        public string Address { get; set; }
        public string Hash { get; set; }
        public PaymentTransactionInfo TransactionInfo { get; set; }
    }
}