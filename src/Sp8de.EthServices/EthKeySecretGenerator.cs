using Nethereum.Signer;
using Sp8de.Common.Interfaces;
using System;

namespace Sp8de.EthServices
{
    public class EthKeySecretGenerator : IKeySecretGenerator
    {
        public IKeySecret Generate()
        {
            var key = EthECKey.GenerateKey();

            return new EthKeySecret()
            {
                PrivateKey = key.GetPrivateKey(),
                PublicAddress = key.GetPublicAddress()
            };
        }
    }
}
