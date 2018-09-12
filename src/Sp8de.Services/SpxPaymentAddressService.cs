using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Sp8de.Common.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Services
{
    public class SpxPaymentAddressService : IPaymentAddressService
    {
        private readonly SpxPaymentGatewayConfig config;
        private readonly ILogger<SpxPaymentAddressService> logger;

        public SpxPaymentAddressService(SpxPaymentGatewayConfig config, ILogger<SpxPaymentAddressService> logger)
        {
            this.config = config;
            this.logger = logger;
        }

        public async Task<NewWalletAddress> GenerateAddress(Currency currency)
        {
            var client = new HttpClient();

            if (config.Settings == null)
            {
                throw new ArgumentNullException(nameof(config.Settings));
            }

            var currencySettings = config.Settings.FirstOrDefault(x => x.Currency == currency.ToString());
            if (currencySettings == null)
            {
                throw new ArgumentNullException(nameof(currencySettings));
            }

            var requestItems = new[]
            {
                new KeyValuePair<string, string>("Currency", currencySettings.Currency),
                new KeyValuePair<string, string>("Confirmations", currencySettings.Confirmations.ToString()),
                new KeyValuePair<string, string>("FeeLevel", currencySettings.FeeLevel.ToString()),
                new KeyValuePair<string, string>("PayoutAddress", currencySettings.PayoutAddress),

                new KeyValuePair<string, string>("CallbackUrl", config.CallbackUrl),
                new KeyValuePair<string, string>("ApiKey", config.ApiKey),
                new KeyValuePair<string, string>("Nonce", DateTime.UtcNow.ToString("R"))
            };

            var requestContent = string.Join("&", requestItems.OrderBy(x => x.Key).Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value ?? "")}"));

            try
            {
                var data = new FormUrlEncodedContent(requestItems);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("ApiKey", config.ApiKey);
                data.Headers.Add("HMAC", HMACSHA512Hex(requestContent));

                var res = await client.PostAsync(config.ApiUrl, data);
                var content = await res.Content.ReadAsStringAsync();

                var result = JsonConvert.DeserializeObject<NewWalletAddress>(content);

                return result;
            }
            catch (Exception e)
            {
                logger.LogError("GenerateAddress Exception " + requestContent + " " + e.ToString());
                throw;
            }
        }

        private string HMACSHA512Hex(string input)
        {
            var key = Encoding.UTF8.GetBytes(config.ApiSecret);
            using (var hm = new HMACSHA512(key))
            {
                var signed = hm.ComputeHash(Encoding.UTF8.GetBytes(input));
                return BitConverter.ToString(signed).Replace("-", string.Empty);
            }
        }
    }
}
