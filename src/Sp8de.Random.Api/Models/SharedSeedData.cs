using Sp8de.Common.RandomModels;
using System;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class SharedSeedData
    {
        public string Id { set; get; }
        public SharedSeedMetaData MetaData { get; set; }
        public List<SeedItem> Items { get; set; }
    }

    public class SeedItem
    {
        public UserType Type { get; set; }
        public string PubKey { get; set; }
        public string Seed { get; set; }
        public string Nonce { get; set; }
        public string Sign { get; set; }
    }

    public class SharedSeedMetaData
    {
        public string SharedSeedId { get; set; }
        public string RevealTxHash { get; set; }
        public string NodeId { get; set; }

        public DateTime TimeStamp { get; set; }
        public DateTime Expire { get; set; }
        public DateTime Reveal { get; set; }

        public SharedSeedStatus Status { get; set; }

        public string IpfsHash { get; set; }

        public List<KeyValuePair<string, string>> ExtraParams { get; set; }
    }

    public enum SharedSeedStatus
    {
        New,
        Compleated,
        Error,
        Expired
    }
}