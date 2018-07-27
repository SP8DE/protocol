using Sp8de.Common.RandomModels;

namespace Sp8de.Common.RandomModels
{
    public class RevealItem : SignedItem
    {
        public long Seed { get; set; }

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
