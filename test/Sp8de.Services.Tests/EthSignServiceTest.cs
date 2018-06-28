using Sp8de.EthServices;
using System;
using Xunit;

namespace Sp8de.Services.Tests
{
    public class EthSignServiceTest
    {
        [Fact]
        public void EthSignTest()
        {
            string message = "test message";

            var generator = new EthKeySecretGenerator();
            var key = generator.Generate();

            Assert.NotNull(key);

            var service = new EthSignService();
            var signature = service.SignMessage(message, key.PrivateKey, key.PublicAddress);
            Assert.NotNull(signature);

            var rs = service.VerifySignature(message, signature, key.PublicAddress);
            Assert.True(rs);
        }
    }
}
