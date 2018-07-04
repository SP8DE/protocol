using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class CommitResponse
    {
        public string GameId { get; set; }
        public List<CommitItem> Items { get; set; }
        public string MetaData { get; set; }
    }
}
