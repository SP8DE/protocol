using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sp8de.Common.Enums;
using Sp8de.DataModel;
using System;
using System.Threading.Tasks;

namespace Sp8de.Services
{
    public interface IWalletService
    {
        Task ProcessPayment(Guid userId, decimal amount, WalletTransactionType type);
    }

    public class WalletService : IWalletService
    {
        private readonly ILogger<IWalletService> logger;
        private readonly Sp8deDbContext context;

        public WalletService(ILogger<IWalletService> logger, Sp8deDbContext context)
        {
            this.logger = logger;
            this.context = context;
        }

        public async Task ProcessPayment(Guid userId, decimal amount, WalletTransactionType type)
        {
            if (type != WalletTransactionType.ServiceFee)
            {
                throw new NotImplementedException();
            }

            using (var transaction = await context.Database.BeginTransactionAsync())
            {
                var wallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId && w.Currency == Currency.SPX);
                if (wallet == null)
                {
                    wallet = new Wallet()
                    {
                        UserId = userId,
                        Amount = 0,
                        Currency = Currency.SPX,
                    };
                    context.Wallets.Add(wallet);
                    await context.SaveChangesAsync();
                }

                context.Add(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    Amount = amount,
                    DateCreated = DateTime.UtcNow,
                    Currency = wallet.Currency,
                    Type = type,
                    Status = WalletTransactionStatus.Compleated,
                    Wallet = wallet,
                    WalletId = wallet.Id
                });

                wallet.Amount += amount;

                await context.SaveChangesAsync();
                transaction.Commit();

            }
        }
    }
}
