using Sp8de.Common.RandomModels;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class RevealRequest
    {
        public string SharedSeedId { get; set; }
        public List<RevealItem> Items { get; set; }
    }
}
