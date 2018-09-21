using Nethereum.Signer;
using Nethereum.Util;
using Sp8de.Common.Interfaces;

namespace Sp8de.EthServices
{
    public class EthCryptoService : ICryptoService
    {
        public string SignMessage(byte[] message, string privateKey)
        {
            var signer = new EthereumMessageSigner();
            return signer.HashAndSign(message, new EthECKey(privateKey));
        }

        public string SignMessage(string message, string privateKey)
        {
            var signer = new EthereumMessageSigner();
            return signer.EncodeUTF8AndSign(message, new EthECKey(privateKey));
        }

        public bool VerifySignature(string message, string signature, string pubKey)
        {
            var signer = new EthereumMessageSigner();
            var account = signer.EncodeUTF8AndEcRecover(message, signature);
            return string.Equals(account, pubKey, System.StringComparison.InvariantCultureIgnoreCase);
        }

        public byte[] CalculateHash(byte[] value)
        {
            return new Sha3Keccack().CalculateHash(value);
        }
    }
}
