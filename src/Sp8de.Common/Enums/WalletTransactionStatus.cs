using System;

namespace Sp8de.Common.Enums
{
    [Flags]
    public enum WalletTransactionStatus
    {
        New = 0,
        Pending = 1,
        Blocked = 2,

        ConfirmedByUser = 4,
        ConfirmedByManager = 8,

        Compleated = 16,

        Cancelled = 32,
        Rejected = 64,
        Error = 128
    }
}
