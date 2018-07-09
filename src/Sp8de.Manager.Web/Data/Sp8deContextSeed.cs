using Sp8de.DataModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Data
{
    public class Sp8deContextSeed
    {
        public static async Task SeedAsync(Sp8deDbContext context)
        {
            var userId = Guid.Parse("c8665ddd-5297-4cb7-b0a8-aa27c94bb8cc");

            if (!context.UserApiKeys.Any())
            {
                context.UserApiKeys.Add(new UserApiKey()
                {
                    DateCreated = DateTime.UtcNow,
                    ApiKey = string.Join("", Enumerable.Repeat("X", 32)),
                    ApiSecret = string.Join("", Enumerable.Repeat("Y", 64)),
                    IsActive = true,
                    UserId = userId,
                    Name = "DemoUser",
                    Limit = 1000000
                });
                await context.SaveChangesAsync();
            }

            if (!context.Wallets.Any())
            {
                context.Wallets.Add(new Wallet()
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Currency = Common.Enums.Currency.SPX,
                    Amount = 1000000
                });
                await context.SaveChangesAsync();
            }

            if (!context.BlockchainAddresses.Any())
            {
                context.BlockchainAddresses.Add(new BlockchainAddress()
                {
                    Address = "0x6a43ece9026a36c5498d740a4b06bb25391d4bde",
                    Currency = Common.Enums.Currency.SPX,
                    DateCreated = DateTime.UtcNow,
                    IsActive = true,
                    GatewayCode = "SPAY",
                    Type = Common.Enums.BlockchainAddressType.Deposit,
                    Id = Guid.NewGuid(),
                    UserId = userId
                });
                await context.SaveChangesAsync();
            }

            if (!context.BlockchainTransactions.Any())
            {
                context.BlockchainTransactions.Add(new BlockchainTransaction()
                {
                    DateCreated = DateTime.UtcNow,
                    Currency = Common.Enums.Currency.SPX,
                    Type = Common.Enums.BlockchainTransactionType.Deposit,
                    Address = "0x6a43ece9026a36c5498d740a4b06bb25391d4bde",
                    Amount = 110184.03m,
                    Id = Guid.NewGuid(),
                    Hash = "0x3f58561e435317501502ae18d97e206ab2569a9a563d2c83e13524af8a513797",
                    BlockchainAddressId = context.BlockchainAddresses.First(x => x.Address == "0x6a43ece9026a36c5498d740a4b06bb25391d4bde").Id,
                    Status = Common.Enums.BlockchainTransactionStatus.ConfirmedAndValidated
                });

                await context.SaveChangesAsync();
            }


            if (!context.WalletTransactions.Any())
            {
                context.WalletTransactions.Add(new WalletTransaction()
                {
                    Id = Guid.NewGuid(),
                    Currency = Common.Enums.Currency.SPX,
                    DateCreated = DateTime.UtcNow,
                    Amount = 110184.03m,
                    Status = Common.Enums.WalletTransactionStatus.Compleated,
                    Type = Common.Enums.WalletTransactionType.WalletDeposit,
                    WalletId = context.Wallets.First(x => x.UserId == userId && x.Currency == Common.Enums.Currency.SPX).Id,
                    BlockchainTransactionId = context.BlockchainTransactions.First(x => x.Hash == "0x3f58561e435317501502ae18d97e206ab2569a9a563d2c83e13524af8a513797").Id
                });
                await context.SaveChangesAsync();
            }


        }
    }
}
