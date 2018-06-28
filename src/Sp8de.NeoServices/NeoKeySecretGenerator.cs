using Sp8de.Common.Interfaces;
using System.Security.Cryptography;

namespace Sp8de.NeoServices
{
    public class NeoKeySecretGenerator: IKeySecretGenerator
    {
        public IKeySecret Generate()
        {
            using (CngKey key = CngKey.Create(CngAlgorithm.ECDsaP256, null, new CngKeyCreationParameters { ExportPolicy = CngExportPolicies.AllowPlaintextArchiving }))
            {
                var privateKey = key.Export(CngKeyBlobFormat.EccPrivateBlob);
                var account = new NeoModules.KeyPairs.KeyPair(privateKey);

                return new NeoKeySecret()
                {
                    PrivateKey = account.Export(),
                    PublicAddress = account.PublicKey.ToString()
                };
            }
        }
    }
}
