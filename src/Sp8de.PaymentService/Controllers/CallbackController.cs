using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Sp8de.Common.Enums;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.PaymentService.Models;

namespace Sp8de.PaymentService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CallbackController : ControllerBase
    {
        private ILogger<CallbackController> logger;
        private IPaymentTransactionService paymentService;
        private PaymentGatewayConfig config;

        public CallbackController(ILogger<CallbackController> logger, IPaymentTransactionService paymentsService, PaymentGatewayConfig config)
        {
            this.logger = logger;
            this.paymentService = paymentsService;
            this.config = config;
        }

        [Route("index")]
        [HttpGet]
        public ActionResult Index()
        {
            return Ok(nameof(CallbackController));
        }

        [Route("notify")]
        [HttpPost]
        public async Task<ActionResult> Notify([FromQuery]string customKey, [FromHeader]string HMAC, [FromForm]PaymentNotifyRequest model)
        {
            try
            {
                logger.LogTrace("Start processing callback {Notify} ", nameof(Notify), customKey);

                logger.LogTrace(JsonConvert.SerializeObject(Request.Form));

                if (ModelState.IsValid)
                {
                    var calculatedHMAC = CalculateHMACSHA512Hex(Request.Form);
                    if (!string.Equals(HMAC, calculatedHMAC))
                    {
                        logger.LogError($"Invalid HMAC {HMAC} {calculatedHMAC}");
                        logger.LogError(JsonConvert.SerializeObject(Request.Form));
                        return Content("ER");
                    }

                    var request = new ProcessPaymentTransaction()
                    {
                        TransactionHash = model.TransactionHash,
                        Address = model.Address,
                        Amount = model.Amount,
                        AmountBigInt = model.AmountBigInt,
                        Currency = Enum.Parse<Currency>(model.Currency), // TODO
                        IsConfirmed = model.IsConfirmed,
                        VerificationCode = model.VerificationCode // TODO check
                    };

                    var rs = await paymentService.ProcessCallback(request);
                    if (rs.IsValid)
                    {
                        logger.LogInformation("End processing Notify");
                        return Content("OK");
                    }
                    else
                    {
                        logger.LogError("End processing Notify with Error");
                        return Content("ER");
                    }
                }
                else
                {
                    logger.LogError("ModelState Error", JsonConvert.SerializeObject(ModelState));
                }
            }
            catch (Exception e)
            {
                logger.LogError("paymentTransactionService.ProcessCallback Exception {error}", e.ToString());
            }

            logger.LogInformation("Finish processing callback {Notify} {CustomKey}", nameof(Notify), customKey);

            return Content("ER");
        }

        private string CalculateHMACSHA512Hex(IFormCollection request)
        {
            var requestContent = string.Join("&", request.OrderBy(x => x.Key).Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value)}"));
            var key = Encoding.UTF8.GetBytes(config.ApiSecret);
            using (var hm = new HMACSHA512(key))
            {
                var signed = hm.ComputeHash(Encoding.UTF8.GetBytes(requestContent));
                return BitConverter.ToString(signed).Replace("-", string.Empty);
            }
        }

    }
}
