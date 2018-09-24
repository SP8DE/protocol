namespace Sp8de.Common.RandomModels
{
    public class SignedItem
    {
        public UserType Type { get; set; }
        public string PubKey { get; set; }
        public string Nonce { get; set; }
        public string Sign { get; set; }
        public string Seed { get; set; }

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

        public override string ToString()
        {
            return $"{this.PubKey.ToLowerInvariant()};{this.Seed};{this.Nonce}";
        }
    }
}
