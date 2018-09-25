using Sp8de.Common.RandomModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    public interface IChaosProtocolService
    {
        Task<ProtocolTransactionResponse> CreateTransaction(List<Common.RandomModels.SignedItem> items, ChaosProtocolSettings settings);
        Task<ProtocolTransactionResponse> RevealTransaction(string transactionId, List<Common.RandomModels.RevealItem> items);
    }
}
