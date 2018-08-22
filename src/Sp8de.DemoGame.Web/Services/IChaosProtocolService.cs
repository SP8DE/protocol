using System.Collections.Generic;
using System.Threading.Tasks;
using Sp8de.Common.RandomModels;

namespace Sp8de.DemoGame.Web.Services
{
    public interface IChaosProtocolService1
    {
        Task<ProtocolTransaction> CreateTransaction(List<SignedItem> items, ChaosProtocolSettings settings);
        Task<ProtocolTransaction> RevealTransaction(string transactionId, List<RevealItem> items);
    }
}