using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using System.Collections.Generic;

namespace Sp8de.DemoGame.Web.Services
{
    public class ProtocolTransactionResponse : IEntity
    {
        public string Id { get; set; }
        public List<SignedItem> Items { get; set; }
        public string Signer { get; set; }
        public string DependsOn { get; set; }
        public Anchor Anchor { get; set; }
    }
}
