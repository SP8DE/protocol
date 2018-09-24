using Sp8de.Common.BlockModels;
using Sp8de.Common.RandomModels;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Services
{
    public class ProtocolTransaction
    {
        public Sp8deTransactionType Type { get; set; }
        public IList<SignedItem> Items { get; set; }
        public string DependsOn { get; set; }
        public RandomSettings RandomSettings { get; set; }
        public Dictionary<string, IList<string>> Extended { get; set; }
    }
}
