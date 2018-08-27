using Sp8de.Common.RandomModels;
using Sp8de.Random.Api.Models;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Services
{
    public class RevealSharedSeedData
    {
        public string Id { set; get; }
        public SharedSeedMetaData MetaData { get; set; }
        public List<RevealItem> Items { get; set; }
        public List<uint> SharedSeed { get; set; }
    }
}