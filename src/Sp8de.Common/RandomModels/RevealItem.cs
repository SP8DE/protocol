using Sp8de.Common.Interfaces;

namespace Sp8de.Common.RandomModels
{
    public class RevealItem : SignedItem, IEntity
    {
        public long Seed { get; set; }

        public string Id => Sign;

        public override string ToString()
        {
            return $"${this.PubKey};${this.Nonce};${this.Seed}";
        }

        public CommitItem ToCommitItem()
        {
            return new CommitItem()
            {
                PubKey = this.PubKey,
                Nonce = this.Nonce,
                Sign = this.Sign,
                Type = this.Type
            };
        }
    }
}
