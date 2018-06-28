using Sp8de.Common.Enums;

namespace Sp8de.Common.Models
{
    public class ProcessPaymentTransaction
    {
        public string TransactionHash { get; set; }
        public string Address { get; set; }
        public string GatewayCode { get; set; }
        public decimal Amount { get; set; }
        public string AmountBigInt { get; set; }
        public decimal Fee { get; set; }
        public Currency Currency { get; set; }
        public bool IsConfirmed { get; set; }
        public string VerificationCode { get; set; }
    }
}
