namespace Sp8de.Random.Api.Models
{
    public class ResponseHeader
    {
        public string SeedDataId { get; set; }
        public string Origin { get; set; }
        public string RevealSeedDataHash { get; set; }
        public string BodyHash { get; set; }
    }
}