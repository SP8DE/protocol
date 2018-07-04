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
}
