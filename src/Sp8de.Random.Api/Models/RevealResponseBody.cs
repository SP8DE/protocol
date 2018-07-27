using Sp8de.Common.RandomModels;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class RevealResponseBody
    {
        public List<int> SeedData { get; set; }
        public List<RevealItem> Items { get; set; }
    }
}
