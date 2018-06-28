using Sp8de.Common;
using Sp8de.Common.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.DataModel
{
    public class BlockchainAddress
    {
        public Guid Id { get; set; }
        public BlockchainAddressType Type { get; set; }
        public Guid? UserId { get; set; }
        public ApplicationUser User { get; set; }
        public string Address { get; set; }
        public string VerificationCode { get; set; }
        public Currency Currency { get; set; }
        public string GatewayCode { get; set; }
        public DateTime DateCreated { get; set; }
        public bool IsActive { get; set; }

        public virtual ICollection<BlockchainTransaction> BlockchainTransactions { get; set; }
    }
}
