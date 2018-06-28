using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

namespace Sp8de.PaymentService.Models
{
    public class PaymentNotifyRequest
    {
        [Required]
        public string TransactionHash { get; set; }

        [Required]
        public string Address { get; set; }

        [Required]
        public string VerificationCode { get; set; }

        public decimal Amount { get; set; }
        public string AmountBigInt { get; set; }

        public string Currency { get; set; }

        [Range(0, int.MaxValue)]
        public int BlockConfirmations { get; set; }

        public bool IsConfirmed { get; set; }
    }



}
