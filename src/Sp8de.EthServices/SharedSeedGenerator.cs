using Org.BouncyCastle.Security;
using Sp8de.Common.Utils;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Sp8de.EthServices
{
    public static class SharedSeedGenerator
    {
        private const string DigestAlgorithm = "KECCAK-384";

        public static (IList<uint> seedArray, string seedHash) CreateSharedSeed(IEnumerable<string> sharedSeedData)
        {
            var aggregated = string.Join(";", sharedSeedData);
            var hashedBytes = DigestUtilities.CalculateDigest(DigestAlgorithm, Encoding.ASCII.GetBytes(aggregated));

            var size = hashedBytes.Count() / sizeof(uint);
            var ints = new uint[size];
            for (var index = 0; index < size; index++)
            {
                ints[index] = ToUInt32(hashedBytes, index * sizeof(uint));
            }

            return (ints, HexConverter.ToHex(hashedBytes));
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
