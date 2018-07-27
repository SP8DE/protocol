using Sp8de.Common.Enums;
using System.Threading.Tasks;

namespace Sp8de.Services
{
    public interface IPaymentAddressService
    {
        Task<NewWalletAddress> GenerateAddress(Currency currency);
    }
}
