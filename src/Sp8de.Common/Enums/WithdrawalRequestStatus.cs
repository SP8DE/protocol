using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Enums
{
    public enum WithdrawalRequestStatus
    {
        New = 0,
        InProcess = 1,
        Done = 2,
        Error = 3,
        Rejected = 4,
        Cancelled = 5
    }
}
