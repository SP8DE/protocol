using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sp8de.Common.Enums;
using Sp8de.DataModel;
using Sp8de.Manager.Web.Controllers;
using Sp8de.Manager.Web.Models;
using System;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Services
{
    public class FinService : IFinService
    {
        private readonly ILogger<IFinService> logger;
        private readonly Sp8deDbContext context;

        public FinService(ILogger<IFinService> logger, Sp8deDbContext context)
        {
            this.logger = logger;
            this.context = context;
        }

        public async Task<(Guid requestId, string withdrawalCode)> CreateWithdrawalRequest(CreateWithdrawalRequestModel model)
        {
            logger.LogInformation($"{model} Starting...");

            decimal amountCommission = 1m;

            var finalAmount = model.Amount - amountCommission;
            if (model.Amount <= 0 || finalAmount <= 0)
                throw new ArgumentException("ErrorAmountMustBeGreaterZero");

            var wallet = await context.Wallets.FirstAsync(x => x.Currency == model.Currency && x.UserId == model.UserId);
            if (wallet.Amount < model.Amount)
                throw new ArgumentException("ErrorNotEnoughMoney");

            if (wallet.Currency != Currency.SPX)
                throw new ArgumentException($"Withdrawal requests from {wallet.Currency} not allowed");

            wallet.Amount -= model.Amount;

            var code = new PasswordGenerator(20).IncludeLowercase().IncludeUppercase().IncludeNumeric().Next();

            var walletTransaction = new WalletTransaction
            {
                Id = Guid.NewGuid(),
                Amount = model.Amount,
                DateCreated = DateTime.UtcNow,
                Currency = Currency.SPX,
                Type = WalletTransactionType.WalletWithdraw,
                WithdrawAddress = model.Wallet,
                Status = WalletTransactionStatus.New,
                Wallet = wallet,
            };
            context.Add(walletTransaction);

            var request = new WithdrawalRequest
            {
                Id = Guid.NewGuid(),
                Amount = model.Amount,
                AmountWithCommission = finalAmount,
                Currency = model.Currency,
                UserId = model.UserId,
                Status = WithdrawalRequestStatus.New,
                Wallet = model.Wallet,
                Code = code,
                DateCreate = DateTime.UtcNow,
                IsApprovedByManager = false,
                IsApprovedByUser = false,
                WalletTransactionId = walletTransaction.Id
            };

            context.Add(request);

            await context.SaveChangesAsync();

            return (request.Id, code);
        }
    }
}
