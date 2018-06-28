using Nethereum.Signer;
using Nethereum.Util;
using Sp8de.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.EthServices
{
    public class EthSignService : ISignService
    {
        public string SignMessage(string message, string privateKey, string pubKey)
        {
            var signer = new EthereumMessageSigner();
            return signer.HashAndSign(message, privateKey);
        }

        public bool VerifySignature(string message, string signature, string pubKey)
        {
            var signer = new EthereumMessageSigner();
            var account = signer.HashAndEcRecover(message, signature);
            return account == pubKey;
        }
    }
}
