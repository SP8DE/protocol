using System.Collections.Generic;

namespace Sp8de.PaymentService.Models

{
    public class PaymentGatewayConfig
    {
        public string ApiUrl { get; set; }
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public string CallbackUrl { get; set; }
        public List<CurrencyItem> Settings { get; set; }
    }



}
