using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class RevealRequest
    {
        public string GameId { get; set; }
        public List<RevealItem> Items { get; set; }
    }
}
