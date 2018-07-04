namespace Sp8de.Random.Api.Models
{
    public class SignedItem
    {
        public UserType Type { get; set; }
        public string PubKey { get; set; }
        public string Salt { get; set; }
        public string Sign { get; set; }
    }

}
