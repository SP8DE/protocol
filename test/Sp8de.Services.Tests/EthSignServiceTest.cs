using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Signer;
using Nethereum.Util;
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
            string message = "{\"version\":\"1\"}";

            var generator = new EthKeySecretManager();
            var key = generator.Generate();

            Assert.NotNull(key);

            var service = new EthSignService();
            var signature = service.SignMessage(message, key.PrivateKey);
            Assert.NotNull(signature);

            var rs = service.VerifySignature(message, signature, key.PublicAddress);
            Assert.True(rs);
        }

        [Theory]
        [InlineData("d7d60dc1c9376fe0011a854fef00d62dbfb9c7224954c396d057d02223abd2ea")]
        [InlineData("42e40a6e9ccdf1003f8be7230db99d2d1a87f42fb0d0969b472da9325dcda7af")]
        public void EthSignTests(string pk)
        {
            var generator = new EthKeySecretManager();

            var key = generator.LoadKeySecret(pk); //sp8de
            string message = $"{key.PublicAddress.ToLowerInvariant()};1;1";

            Assert.NotNull(key);

            var service = new EthSignService();
            var signature = service.SignMessage(message, key.PrivateKey);
            Assert.NotNull(signature);

            var rs = service.VerifySignature(message, signature, key.PublicAddress);
            Assert.True(rs);
        }

        [Fact]
        public void EthSignTest32()
        {
            string message = "test";

            var generator = new EthKeySecretManager();
            var key = generator.LoadKeySecret("d3a7d42d881a9b59ccefcac0f5bcc69f85e68fdf0bfb6fcbbe42373320de420f");

            Assert.NotNull(key);

            var service = new EthSignService();
            var signature = service.SignMessage(message, key.PrivateKey);
            Assert.NotNull(signature);

            var rs = service.VerifySignature(message, signature, key.PublicAddress);
            Assert.True(rs);
        }

        [Fact]
        public void EthSignTest2()
        {
            string message = "test";

            var generator = new EthKeySecretManager();
            var key = generator.LoadKeySecret("d3a7d42d881a9b59ccefcac0f5bcc69f85e68fdf0bfb6fcbbe42373320de420f");

            Assert.NotNull(key);

            var service = new EthSignService();
            var signature = service.SignMessage(message, key.PrivateKey);
            Assert.NotNull(signature);

            var rs = service.VerifySignature(message, signature, key.PublicAddress);
            Assert.True(rs);
        }

        [Fact]
        public void EthSignTest3()
        {
            var signature = "0xdb46c6be4b1ee0ef670625630d38899213ea5d63d749954d82a4651b81f7d44f6d16e2e4903038c022b71d11baa26b08142c6b9f5db106d7b96b57d1836ce10e1b";
            var text = "test";

            var generator = new EthKeySecretManager();
            var key = generator.LoadKeySecret("0xd3a7d42d881a9b59ccefcac0f5bcc69f85e68fdf0bfb6fcbbe42373320de420f");

            var service = new EthSignService();
            var rs = service.VerifySignature(text, signature, key.PublicAddress);
            Assert.True(rs);

            //Assert.NotNull(key);

            //
            //var signature2 = service.SignMessage(message, key.PrivateKey, key.PublicAddress);
            //Assert.NotNull(signature);

        }

        [Fact]
        public void test4()
        {
            var signature =
                "0xdb46c6be4b1ee0ef670625630d38899213ea5d63d749954d82a4651b81f7d44f6d16e2e4903038c022b71d11baa26b08142c6b9f5db106d7b96b57d1836ce10e1b";
            var text = "test";
            var hasher = new Sha3Keccack();
            var hash = hasher.CalculateHash(text);
            var signer = new EthereumMessageSigner();
            var account = signer.EncodeUTF8AndEcRecover(text, signature);
            Assert.Equal("0xe77992311815D6961cBB231CFd2009990203385F".ToLower(), account.EnsureHexPrefix().ToLower());

            signature = signer.Sign(hash.HexToByteArray(),
                "0xd3a7d42d881a9b59ccefcac0f5bcc69f85e68fdf0bfb6fcbbe42373320de420f");

            account = signer.EcRecover(hash.HexToByteArray(), signature);

            Assert.Equal("0x12890d2cce102216644c59dae5baed380d84830c".ToLower(), account.EnsureHexPrefix().ToLower());
        }
    }
}
