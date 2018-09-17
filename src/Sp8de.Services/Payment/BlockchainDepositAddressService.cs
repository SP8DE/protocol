using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sp8de.Common.Enums;
using Sp8de.DataModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Services
{
    public class BlockchainDepositAddressService : IBlockchainDepositAddressService
    {
        private const string defaultGatewayCode = "SPAY";
        private readonly IPaymentAddressService addressService;
        private readonly ILogger<IBlockchainDepositAddressService> logger;
        private readonly Sp8deDbContext context;

        public BlockchainDepositAddressService(IPaymentAddressService addressService, ILogger<IBlockchainDepositAddressService> logger, Sp8deDbContext context)
        {
            this.addressService = addressService;
            this.logger = logger;
            this.context = context;
        }

        public async Task<IList<WalletInfo>> GetAddresses(Guid userId)
        {
            var wallets = await context.BlockchainAddresses
                .Where(x => x.UserId == userId && x.Type == BlockchainAddressType.Deposit && x.IsActive == true)
                .Select(x => new WalletInfo()
                {
                    WalletId = x.Id,
                    Address = x.Address,
                    Currency = x.Currency,
                    GatewayCode = x.GatewayCode
                }).ToArrayAsync();

            logger.LogInformation("Wallets Found {WalletsCount} {UserId}", wallets.Length, userId);

            return wallets;
        }

        public async Task<WalletInfo> GenerateAddress(Currency currency, Guid userId)
        {
            logger.LogInformation("Start {Method} {Currency} {UserId}", nameof(GenerateAddress), currency, userId);

            NewWalletAddress result = null;
            //var customKey = CreateKey(userId);
            try
            {
                result = await addressService.GenerateAddress(currency);
            }
            catch (Exception e)
            {
                logger.LogWarning("Wallet was not created {Method} {UserId} {Exception}", nameof(GenerateAddress), userId, e.ToString());

                logger.LogError("Wallet was not created {Method} {UserId} {Exception}", nameof(GenerateAddress), userId, e.ToString());
            }

            if (result == null)
            {
                logger.LogError("Wallet was not created {Method} {UserId}", nameof(GenerateAddress), userId);
                //TODO: Try to use another gateway?
                return null;
            }

            var blockchainAddress = new BlockchainAddress()
            {
                Type = BlockchainAddressType.Deposit,
                DateCreated = DateTime.UtcNow,
                GatewayCode = defaultGatewayCode,
                Address = result.Address,
                VerificationCode = result.VerificationCode,
                UserId = userId,
                IsActive = true,
                Currency = currency
            };

            context.BlockchainAddresses.Add(blockchainAddress);
            await context.SaveChangesAsync();

            logger.LogInformation("Wallet created {WalletId};Address:{Address};UserId:{UserId}", blockchainAddress.Id, result.Address, blockchainAddress.UserId);

            return new WalletInfo()
            {
                WalletId = blockchainAddress.Id,
                Address = blockchainAddress.Address,
                Currency = blockchainAddress.Currency
            };
        }
    }
}
