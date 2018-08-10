using System;
using System.Text;

namespace Sp8de.Common.BlockModels
{
    public enum Sp8deTransactionStatus
    {
        New = 1,
        Pending = 2,
        Expired = 3,
        Failed = 4,
        Confirmed = 5
    }
}
