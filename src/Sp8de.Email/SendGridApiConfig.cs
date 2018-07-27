namespace Sp8de.Email
{
    public class SendGridApiConfig
    {
        public string ApiKey { get; set; }
        public string DomainName { get; set; }
        public string FromEmail { get; set; }
        public string FromEmailName { get; set; }
        public string BccEmail { get; set; }
    }
}
