using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Enums
{
    public enum WalletTransactionType
    {
        Undefined = 0,

        WalletDeposit = 1,
        WalletWithdraw = 2,

        GameWin = 4,
        GameLose = 8,

        ServiceFee = 16
    }
}
