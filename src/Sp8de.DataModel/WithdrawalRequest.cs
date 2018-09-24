using Sp8de.Common.Enums;
using System;

namespace Sp8de.DataModel
{
    public class WithdrawalRequest
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public decimal AmountWithCommission { get; set; }
        public Currency Currency { get; set; }
        public string Wallet { get; set; }
        public DateTime DateCreate { get; set; }
        public DateTime? DateProcessStart { get; set; }
        public DateTime? DateDone { get; set; }
        public string Code { get; set; }
        public bool IsApprovedByUser { get; set; }
        public bool IsApprovedByManager { get; set; }

        public WithdrawalRequestStatus Status { get; set; }

        public Guid UserId { get; set; }
        public ApplicationUser User { get; set; }
        public Guid WalletTransactionId { get; set; }

        public bool IsTimeForConfirmEnought() => (DateTime.UtcNow - DateCreate).TotalMinutes <= 30;

        public bool CanCancelledByUser() => !IsApprovedByUser && Status == WithdrawalRequestStatus.New;
        public bool CanConfirmAndPayByAdmin() => IsApprovedByUser && Status != WithdrawalRequestStatus.Done;
        public bool CanResendEmail() => Status == WithdrawalRequestStatus.New;
    }
}
