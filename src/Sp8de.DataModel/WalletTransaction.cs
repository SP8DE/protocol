using Sp8de.Common.Enums;
using System;

namespace Sp8de.DataModel
{
    public class WalletTransaction
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public Currency Currency { get; set; }
        public DateTime DateCreated { get; set; }

        public Guid WalletId { get; set; }
        public Wallet Wallet { get; set; }

        public string WithdrawAddress { get; set; }

        public WalletTransactionType Type { get; set; }
        public WalletTransactionStatus Status { get; set; }

        public BlockchainTransaction BlockchainTransaction { get; set; }
        public Guid? BlockchainTransactionId { get; set; }
    }
}
