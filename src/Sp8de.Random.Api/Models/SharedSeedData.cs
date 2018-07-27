using Sp8de.Common.RandomModels;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class SharedSeedData
    {
        public string Id { set; get; }
        public SharedSeedMetaData MetaData { get; set; }
        public List<CommitItem> Items { get; set; }
    }
}