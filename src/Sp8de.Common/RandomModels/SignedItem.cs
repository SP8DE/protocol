namespace Sp8de.Common.RandomModels
{
    public class SignedItem
    {
        public UserType Type { get; set; }
        public string PubKey { get; set; }
        public string Nonce { get; set; }
        public string Sign { get; set; }
    }
}
