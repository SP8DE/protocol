using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Models
{
    public class CommitRequest
    {
        public int Version { get; set; }
        public List<CommitItem> Items { get; set; }
        public string MetaData { get; set; }
    }

    public class CommitResponse
    {
        public string GameId { get; set; }
        public List<CommitItem> Items { get; set; }
        public string MetaData { get; set; }
    }

    public class RevealRequest
    {
        public string GameId { get; set; }
        public List<RevealItem> Items { get; set; }
    }

    public class RevealResponse
    {
        public string GameId { get; set; }
        public long[] SeedData { get; set; }
        public long[] RandomNumbers { get; set; }
        public List<RevealItem> Items { get; set; }
    }

    public enum UserType
    {
        Player = 1,
        Casino = 2,
        Validator = 3
    }

    public class CommitItem
    {
        public UserType Type { get; set; }
        public string Address { get; set; }
        public string Salt { get; set; }
        public string Sign { get; set; }
    }

    public class RevealItem
    {
        public UserType Type { get; set; }
        public string Address { get; set; }
        public string Salt { get; set; }
        public string Sign { get; set; }
        public long Seed { get; set; }
    }
}
