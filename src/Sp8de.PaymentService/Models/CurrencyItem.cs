namespace Sp8de.PaymentService.Models
{
    public class CurrencyItem
    {
        public string Currency { get; set; }
        public string PayoutAddress { get; set; }
        public int Confirmations { get; set; }
        public int FeeLevel { get; set; }
    }



}
