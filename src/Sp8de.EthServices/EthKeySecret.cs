using Sp8de.Common.Interfaces;

namespace Sp8de.EthServices
{
    public class EthKeySecret : IKeySecret
    {
        public KeyType Type => KeyType.Eth;

        public string PrivateKey { get; set; }

        public string PublicAddress { get; set; }
    }
}
