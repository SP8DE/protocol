﻿using Nethereum.Signer;
using Sp8de.Common.Interfaces;
using System;

namespace Sp8de.EthServices
{
    public class EthKeySecretManager : IKeySecretManager
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

        public IKeySecret LoadKeySecret(string privateKey)
        {
            var key = new EthECKey(privateKey);

            return new EthKeySecret()
            {
                PrivateKey = key.GetPrivateKey(),
                PublicAddress = key.GetPublicAddress()
            };
        }
    }
}
