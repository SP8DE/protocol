using Sp8de.Common;
using Sp8de.Common.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.DataModel
{
    public class BlockchainTransaction
    {
        public Guid Id { get; set; }
        public string Hash { get; set; } //should be unique and not null!!!
        public Currency Currency { get; set; }
        public string Address { get; set; }
        public decimal Amount { get; set; }
        public decimal Fee { get; set; }
        public BlockchainTransactionType Type { get; set; }
        public BlockchainTransactionStatus Status { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime? LastUpdated { get; set; }
        public DateTime? PaymentTransactionDate { get; set; }
        public string ExtraData { get; set; }
        public BlockchainAddress BlockchainAddress { get; set; }
        public Guid BlockchainAddressId { get; set; }
    }
}
