using Sp8de.Common.RandomModels;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    public interface IChaosProtocolService
    {
        Task<ProtocolTransaction> CreateTransaction(List<SignedItem> items, ChaosProtocolSettings settings);
        Task<ProtocolTransaction> RevealTransaction(string transactionId, List<RevealItem> items);
    }
}
