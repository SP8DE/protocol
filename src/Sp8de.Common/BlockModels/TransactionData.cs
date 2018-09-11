using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Sp8de.Common.BlockModels
{
    public class TransactionData
    {
        public Dictionary<string, IList<string>> Items { get; set; }
        public string Hash { get; set; }

        public byte[] GetBytes()
        {
            return Encoding.UTF8.GetBytes(string.Join(";", Items.Select(x => $"{x.Key}:{string.Join(",", x.Value)}"))); //temp
        }
    }
}
