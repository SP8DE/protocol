using Sp8de.Common.Enums;
using System;

namespace Sp8de.Manager.Web.Models
{
    public class CreateWithdrawalRequestModel
    {
        public Guid UserId { get; set; }
        public decimal Amount { get; set; }
        public Currency Currency { get; set; }
        public string Wallet { get; set; }

        public string TwoFactorCode { get; set; }

        public override string ToString()
        {
            return $"[CreateWithdrawalRequest] UserId {UserId}, amount {Amount} {Currency}, " +
                   $"wallet {Wallet} ";
        }
    }
}
