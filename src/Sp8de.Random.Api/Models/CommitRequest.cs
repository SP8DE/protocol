using Sp8de.Common.RandomModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Models
{
    public class CommitRequest
    {
        public List<CommitItem> Items { get; set; }
        public string ExtraData { get; set; }
    }
}
