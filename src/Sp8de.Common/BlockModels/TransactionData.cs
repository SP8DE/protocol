using System.Collections.Generic;

namespace Sp8de.Common.BlockModels
{
    public class TransactionData
    {
        public Dictionary<string, IList<string>> Items { get; set; }
        public string Hash { get; set; }
    }
}
