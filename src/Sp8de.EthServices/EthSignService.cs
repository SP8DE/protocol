using Nethereum.Signer;
using Sp8de.Common.Interfaces;

namespace Sp8de.EthServices
{
    public class EthSignService : ISignService
    {
        public string SignMessage(string message, string privateKey)
        {
            var signer = new EthereumMessageSigner();
            return signer.EncodeUTF8AndSign(message, new EthECKey(privateKey));
        }

        public bool VerifySignature(string message, string signature, string pubKey)
        {
            var signer = new EthereumMessageSigner();
            var account = signer.EncodeUTF8AndEcRecover(message, signature);
            return account == pubKey;
        }
    }
}
