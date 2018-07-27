using System;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class SharedSeedMetaData
    {
        public DateTime TimeStamp { get; set; }
        public DateTime Expire { get; set; }
        public string Status { get; set; }
        public string IpfsHash { get; set; }
        public bool IsRevealed { get; set; }
        public string SharedSeedId { get; set; }
        public List<KeyValuePair<string, string>> ExtraParams { get; set; }
    }
}