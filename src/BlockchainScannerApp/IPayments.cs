using System.Threading.Tasks;

namespace BlockchainScannerApp
{
    public interface IPayments
    {
        Task<long> VerifyWalletsAsync(long? fromBlock = null);
    }
}