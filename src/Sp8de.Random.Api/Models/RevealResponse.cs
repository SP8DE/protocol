using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class RevealResponse
    {
        public string GameId { get; set; }
        public long[] SeedData { get; set; }
        public long[] RandomNumbers { get; set; }
        public List<RevealItem> Items { get; set; }
    }
}
