using Sp8de.Common.RandomModels;
using Sp8de.Random.Api.Services;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class CommitResponse
    {
        public ResponseHeader Header { set; get; }
        public CommitBody Body { set; get; }
    }

    public class CommitBody
    {
        public string SharedSeedId { set; get; }
        public List<CommitItem> Items { get; set; }
        public SharedSeedMetaData MetaData { get; set; }
        public bool IsSuccess { get; set; }
    }

}
