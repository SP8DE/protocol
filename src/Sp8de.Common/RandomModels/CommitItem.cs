using System;
using Sp8de.Common.RandomModels;

namespace Sp8de.Common.RandomModels
{
    public class CommitItem 
    {
        public UserType Type { get; set; }
        public string PubKey { get; set; }
        public string Nonce { get; set; }
        public string Sign { get; set; }

        public SignedItem ToSignedItem()
        {
            return new SignedItem()
            {
                PubKey = this.PubKey,
                Nonce = this.Nonce,
                Sign = this.Sign,
                Type = this.Type
            };            
        }
    }
}
