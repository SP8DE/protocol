using System.Collections.Generic;

namespace Sp8de.Services
{
    public class SpxPaymentGatewayConfig
    {
        public string ApiUrl { get; set; }
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public string CallbackUrl { get; set; }
        public List<CurrencyItem> Settings { get; set; }
    }
}
