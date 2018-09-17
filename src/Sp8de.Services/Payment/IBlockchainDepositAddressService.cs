using Sp8de.Common.Enums;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.Services
{
    public interface IBlockchainDepositAddressService
    {
        Task<WalletInfo> GenerateAddress(Currency currency, Guid userId);
        Task<IList<WalletInfo>> GetAddresses(Guid userId);
    }
}
