using Sp8de.Common.Interfaces;

namespace Sp8de.Common.RandomModels
{
    public class RevealItem : IEntity
    {
        public UserType Type { get; set; }
        public string PubKey { get; set; }
        public string Nonce { get; set; }
        public string Sign { get; set; }
        public string Seed { get; set; }        
        public string Id { get => Sign; set => Sign = value; } //TODO REMOVE

        public override string ToString()
        {
            return $"{this.PubKey.ToLowerInvariant()};{this.Seed};{this.Nonce}";
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
