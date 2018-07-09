using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Enums;
using Sp8de.DataModel;
using Sp8de.Manager.Web.Services;
using Sp8de.Services;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Controllers
{
    public class WalletAddressRequest
    {
        [Required]
        public Currency Currency { get; set; }
    }

    public class WalletViewModel
    {
        public string Address { get; set; }
        public string Currency { get; set; }
    }

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

    public class WalletController : Controller
    {
        private readonly IBlockchainDepositAddressService addressService;
        private readonly UserManager<ApplicationUser> userManager;
        private readonly IFinService finService;

        private Guid CurrentUserId { get { return User.GetUserId(); } }

        public WalletController(IBlockchainDepositAddressService addressService, UserManager<ApplicationUser> userManager, IFinService finService)
        {
            this.addressService = addressService;
            this.userManager = userManager;
            this.finService = finService;
        }

        private ApplicationUser GetCurrentUser()
        {
            if (!User.Identity.IsAuthenticated || string.IsNullOrEmpty(User.Identity?.Name))
                return null;

            //if (appUser != null)
            //    return appUser;

            var appUser = userManager.FindByNameAsync(User.Identity?.Name).Result;
            return appUser;
        }

        [HttpPost]
        public async Task<IActionResult> CreateWallet([FromBody] WalletAddressRequest request)
        {
            if (request.Currency == Currency.Undefined)
            {
                return BadRequest("invalid currency");
            }


            var addresses = await addressService.GetAddresses(CurrentUserId);
            if (addresses.Any(x => x.Currency == request.Currency))
            {
                var rs = addresses.FirstOrDefault(x => x.Currency == request.Currency);

                return Ok(new WalletViewModel()
                {
                    Currency = request.Currency.ToString(),
                    Address = rs.Address
                });
            }

            var address = await addressService.GenerateAddress(request.Currency, CurrentUserId);

            return Ok(new WalletViewModel()
            {
                Currency = request.Currency.ToString(),
                Address = address.Address
            });
        }

        public static string ClearCode(string code)
        {
            return string.IsNullOrEmpty(code) ? string.Empty : code.Replace(" ", string.Empty).Replace("-", string.Empty);
        }

        [HttpPost]
        public async Task<IActionResult> CreateWithdrawalRequest([FromBody]CreateWithdrawalRequestModel model)
        {
            model.UserId = CurrentUserId;
            var CurrentUser = GetCurrentUser();
            if (!CurrentUser.TwoFactorEnabled)
                return BadRequest("Two-factor authentication required");

            var is2faTokenValid = await userManager.VerifyTwoFactorTokenAsync(CurrentUser,
                userManager.Options.Tokens.AuthenticatorTokenProvider, ClearCode(model.TwoFactorCode));
            if (!is2faTokenValid)
                return BadRequest("Verification code is invalid");

            var result = finService.CreateWithdrawalRequest(model);

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
