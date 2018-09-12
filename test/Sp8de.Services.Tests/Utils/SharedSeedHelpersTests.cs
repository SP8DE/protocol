using Org.BouncyCastle.Security;
using Sp8de.Common.Utils;
using Sp8de.EthServices;
using System;
using System.Linq;
using System.Text;
using Xunit;

namespace Sp8de.Services.Tests.Utils
{
    public class SharedSeedHelpersTests
    {
        [Fact]
        public void Test()
        {
            var sharedSeedData = new[] { "1948679508", "-4721854150932553650", "3486951862276399275" };

            var aggregated = string.Join(";", sharedSeedData);

            var a1 = Encoding.ASCII.GetBytes(aggregated);

            var data = SharedSeedGenerator.CreateSharedSeed(sharedSeedData);
        }

        [Fact]
        public void DigestTest()
        {
            var sharedSeedData = new[] { "1948679508", "-4721854150932553650", "3486951862276399275" };

            var aggregated = Encoding.ASCII.GetBytes(string.Join(";", sharedSeedData));

            var hashedBytes = DigestUtilities.CalculateDigest("KECCAK-384", aggregated);

            var tx = HexConverter.ToHex(hashedBytes);
        }


        [Fact]
        public void BitConverterTest()
        {
            var byteArray = new byte[] { 72, 187, 184, 216 };
            var intData = SharedSeedGenerator.ToUInt32(byteArray, 0);
            Assert.Equal((uint)1220262104, intData);
        }


        public static UInt32 ToUInt32(byte[] data, int offset)
        {
            if (BitConverter.IsLittleEndian)
            {
                return BitConverter.ToUInt32(BitConverter.IsLittleEndian ? data.Skip(offset).Take(4).Reverse().ToArray() : data, 0);
            }
            return BitConverter.ToUInt32(data, offset);
        }
    }
}
