using Sp8de.Common;
using Sp8de.Common.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.DataModel
{
    public partial class Wallet
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public Currency Currency { get; set; }

        public virtual string ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();
        // add to migration b.Property(u => u.ConcurrencyStamp).IsConcurrencyToken();

        public Guid UserId { get; set; }
        public ApplicationUser User { get; set; }

        public ICollection<WalletTransaction> WalletTransactions { get; set; }
    }
}
