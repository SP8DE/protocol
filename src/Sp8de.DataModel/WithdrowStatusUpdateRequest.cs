using Sp8de.Common.Enums;
using System;

namespace Sp8de.DataModel
{
    public class WithdrowStatusUpdateRequest
    {
        public Guid RequestId { get; set; }
        public BlockchainTransactionStatus Status { get; set; }
        public string Address { get; set; }
        public string TxHash { get; set; }
    }
}
