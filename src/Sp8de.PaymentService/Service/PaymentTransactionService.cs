using Microsoft.Extensions.Logging;
using Sp8de.Common.Enums;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.DataModel;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.PaymentService.Service
{
    public class PaymentTransactionService : IPaymentTransactionService
    {
        private readonly ILogger<IPaymentTransactionService> logger;
        private readonly Sp8deDbContext context;

        public PaymentTransactionService(ILogger<IPaymentTransactionService> logger, Sp8deDbContext context)
        {
            this.logger = logger;
            this.context = context;
        }

        public async Task<PaymentTransactionInfo> ProcessCallback(ProcessPaymentTransaction request)
        {
            var blockchainAddress = context.BlockchainAddresses.FirstOrDefault(addr => addr.Address == request.Address && addr.Currency == request.Currency);
            if (blockchainAddress == null)
            {
                var msg = $"{request.Currency} address not found - {request.Address}";
                logger.LogError(msg);
                throw new ApplicationException(msg);
            }

            if (request.VerificationCode != blockchainAddress.VerificationCode)
            {
                var msg = $"Invalid VerificationCode {request.VerificationCode} for {request.Address}";
                logger.LogError(msg);
                throw new ApplicationException(msg);
            }

            PaymentTransactionInfo transactionInfo;

            using (var transaction = await context.Database.BeginTransactionAsync())
            {
                var wallet = context.Wallets.FirstOrDefault(w => w.UserId == blockchainAddress.UserId && w.Currency == blockchainAddress.Currency);
                if (wallet == null)
                {
                    wallet = new Wallet()
                    {
                        UserId = blockchainAddress.UserId.Value,
                        Amount = 0,
                        Currency = blockchainAddress.Currency,
                    };
                    context.Wallets.Add(wallet);
                    context.SaveChanges();
                }

                var blockchainTransaction = context.BlockchainTransactions
                                                .FirstOrDefault(t => t.Hash == request.TransactionHash &&
                                                                     t.BlockchainAddressId == blockchainAddress.Id);

                if (blockchainTransaction != null)
                {
                    if (blockchainTransaction.Status == BlockchainTransactionStatus.Pending ||
                        blockchainTransaction.Status == BlockchainTransactionStatus.New)
                    {
                        blockchainTransaction.Status = request.IsConfirmed ? BlockchainTransactionStatus.ConfirmedAndValidated : BlockchainTransactionStatus.Pending;
                        blockchainTransaction.LastUpdated = DateTime.UtcNow;
                        context.Update(blockchainTransaction);

                        if (blockchainTransaction.Status == BlockchainTransactionStatus.ConfirmedAndValidated)
                        {
                            context.Add(new WalletTransaction
                            {
                                Id = Guid.NewGuid(),
                                Amount = blockchainTransaction.Amount,
                                DateCreated = DateTime.UtcNow,
                                Currency = wallet.Currency,
                                BlockchainTransaction = blockchainTransaction,
                                BlockchainTransactionId = blockchainTransaction.Id,
                                Type = WalletTransactionType.WalletDeposit,
                                Status = WalletTransactionStatus.Compleated,
                                Wallet = wallet,
                                WalletId = wallet.Id
                            });
                        }
                    }
                    else
                    {
                        logger.LogError($"Can not override status from {blockchainTransaction.Status} to {request.IsConfirmed}");
                    }
                }
                else
                {
                    blockchainTransaction = new BlockchainTransaction
                    {
                        Id = Guid.NewGuid(),
                        Hash = request.TransactionHash,
                        Type = BlockchainTransactionType.Deposit,
                        BlockchainAddressId = blockchainAddress.Id,
                        Amount = request.Amount,
                        //AmountBigInt = request.AmountBigInt,//TODO: Please add as string
                        Currency = request.Currency,
                        Fee = request.Fee,
                        DateCreated = DateTime.UtcNow,
                        Status = request.IsConfirmed ? BlockchainTransactionStatus.ConfirmedAndValidated : BlockchainTransactionStatus.Pending
                    };

                    context.BlockchainTransactions.Add(blockchainTransaction);

                    if (blockchainTransaction.Status == BlockchainTransactionStatus.ConfirmedAndValidated)
                    {
                        wallet.Amount += blockchainTransaction.Amount;

                        if (blockchainTransaction.Status == BlockchainTransactionStatus.ConfirmedAndValidated)
                        {
                            context.Add(new WalletTransaction
                            {
                                Id = Guid.NewGuid(),
                                Amount = blockchainTransaction.Amount,
                                DateCreated = DateTime.UtcNow,
                                Currency = wallet.Currency,
                                BlockchainTransaction = blockchainTransaction,
                                BlockchainTransactionId = blockchainTransaction.Id,
                                Type = WalletTransactionType.WalletDeposit,
                                Status = WalletTransactionStatus.Compleated,
                                Wallet = wallet,
                                WalletId = wallet.Id
                            });
                        }
                    }
                }

                await context.SaveChangesAsync();
                transaction.Commit();

                transactionInfo = new PaymentTransactionInfo
                {
                    TransactionId = blockchainTransaction.Id,
                    TransactionHash = blockchainTransaction.Hash,
                    Amount = blockchainTransaction.Amount,
                    Currency = request.Currency.ToString(),
                    GatewayCode = request.GatewayCode,
                    Status = blockchainTransaction.Status,
                    IsValid = true
                };
            }

            return transactionInfo;
        }
    }
}
