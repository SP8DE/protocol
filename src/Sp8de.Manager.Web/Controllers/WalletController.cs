using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Sp8de.Common.Enums;
using Sp8de.DataModel;
using Sp8de.Manager.Web.Models;
using Sp8de.Manager.Web.Services;
using Sp8de.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Controllers
{
    [Authorize]
    public class WalletController : Controller
    {
        private readonly IBlockchainDepositAddressService addressService;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly Sp8deDbContext context;
        private readonly IMemoryCache memoryCache;

        private Guid CurrentUserId { get { return User.GetUserId(); } }

        public WalletController(IBlockchainDepositAddressService addressService, UserManager<ApplicationUser> userManager, Sp8deDbContext context, IMemoryCache memoryCache)
        {
            this.addressService = addressService;
            this.userManager = userManager;
            this.context = context;
            this.memoryCache = memoryCache;
        }

        public async Task<IActionResult> Index()
        {
            //HACK
            return View(new WalletViewModel()
            {
                Address = "0x618033684Dfedb6ce9b70744567E9E761A1c82F3",
                Balance = 1000,
                Currency = Currency.SPX
            });

            var vm = await CreateWallet(Currency.SPX);
            vm.Balance = GetBalance(Currency.SPX);
            return View(vm);
        }

        public async Task<ActionResult<BalanceModel>> Balance([FromServices]CmcClient client)
        {
            const int tickerId = 2940;

            if (!memoryCache.TryGetValue(nameof(CmcTicker), out CmcTicker ticker))
            {
                ticker = await client.GetTickerData(tickerId, "BTC");
                var tickerETH = await client.GetTickerData(tickerId, "ETH");
                ticker.Data.Quotes.ETH = tickerETH.Data.Quotes.ETH;

                memoryCache.Set(nameof(CmcTicker), ticker,
                    new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromSeconds(60))
                );
            }

            return new BalanceModel()
            {
                Ticker = ticker,
                Balance = GetBalance(Currency.SPX)
            };
        }

        private decimal GetBalance(Currency currency)
        {
            return context.Wallets.Where(x => x.UserId == CurrentUserId && x.Currency == currency).FirstOrDefault()?.Amount ?? 0;
        }


        public IActionResult Deposit()
        {
            //HACK
            return View(new WalletViewModel()
            {
                Address = "0x618033684Dfedb6ce9b70744567E9E761A1c82F3",
                Balance = 1000,
                Currency = Currency.SPX
            });
        }

        public IActionResult Withdraw()
        {
            return View();
        }

        private ApplicationUser GetCurrentUser()
        {
            if (!User.Identity.IsAuthenticated || string.IsNullOrEmpty(User.Identity?.Name))
                return null;

            var appUser = userManager.FindByNameAsync(User.Identity?.Name).Result;
            return appUser;
        }

        private async Task<WalletViewModel> CreateWallet(Currency currency)
        {
            if (currency == Currency.Undefined)
            {
                throw new ArgumentException(nameof(currency));
            }

            var addresses = await addressService.GetAddresses(CurrentUserId);
            if (addresses.Any(x => x.Currency == currency))
            {
                var rs = addresses.FirstOrDefault(x => x.Currency == currency);

                return new WalletViewModel()
                {
                    Currency = currency,
                    Address = rs.Address
                };
            }

            var address = await addressService.GenerateAddress(currency, CurrentUserId);

            return new WalletViewModel()
            {
                Currency = currency,
                Address = address.Address
            };
        }

        public static string ClearCode(string code)
        {
            return string.IsNullOrEmpty(code) ? string.Empty : code.Replace(" ", string.Empty).Replace("-", string.Empty);
        }

        [HttpPost]
        public async Task<IActionResult> CreateWithdrawalRequest([FromServices]IFinService finService, [FromBody]CreateWithdrawalRequestModel model)
        {
            model.UserId = CurrentUserId;
            var CurrentUser = GetCurrentUser();
            if (!CurrentUser.TwoFactorEnabled)
                return BadRequest("Two-factor authentication required");

            var is2faTokenValid = await userManager.VerifyTwoFactorTokenAsync(CurrentUser,
                userManager.Options.Tokens.AuthenticatorTokenProvider, ClearCode(model.TwoFactorCode));
            if (!is2faTokenValid)
                return BadRequest("Verification code is invalid");

            //var result = finService.CreateWithdrawalRequest(model);

            //if (!result.IsSuccess)
            //    return BadRequest(ErrorResult.GetResult(result));

            //var callbackUrl = Url.ConfirmWithdrawalRequestCallbackLink(result.Data.Item1, result.Data.Item2);
            //var email = emailGenerator.GenerateConfirmWithdraw(callbackUrl, CurrentUser.GetFormattedName(), model.Amount, model.Currency, model.Wallet);
            //emailSender.SendEmail(CurrentUser.Email, email.Item1, email.Item2, email.Item2);

            //if (Constants.NotificationWithdrawalRequestsEmails.Any())
            //{
            //    var text = $"<p>User: <strong>{CurrentUser.GetFormattedName()} ({CurrentUser.Email})</strong></p>" +
            //               $"<p>Amount: <strong>{model.Amount} {model.Currency}</strong></p>" +
            //               $"<p>Address: <strong>{model.Wallet}</strong></p>";
            //    foreach (var nEmail in Constants.NotificationWithdrawalRequestsEmails)
            //    {
            //        emailSender.SendEmail(nEmail, "GenesisMarkets - New withdrawal request", text, text);
            //    }
            //}

            return Ok();
        }

        //[AllowAnonymous]
        //public IActionResult ConfirmWithdrawalRequestByCode(Guid requestId, string code)
        //{
        //    var result = finService.ConfirmWithdrawalRequestByCode(requestId, code);
        //    if (!result.IsSuccess || !result.Data)
        //        return BadRequest(ErrorResult.GetResult(result));

        //    return View();
        //}

        //[HttpPost]
        //public IActionResult CancelWithdrawalRequest(Guid requestId)
        //{
        //    var result = finService.CancelWithdrawalRequest(new CancelWithdrawalRequestModel
        //    {
        //        UserId = CurrentUser.Id,
        //        RequestId = requestId
        //    });
        //    if (!result.IsSuccess)
        //        return BadRequest(ErrorResult.GetResult(result));

        //    return Ok();
        //}

    }
}
