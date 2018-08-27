using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Sp8de.Common.Utils
{
    public class SharedSeedHelpers
    {
        public static IList<int> CreateSharedSeedByStrings(IEnumerable<string> sharedSeedData)
        {
            var aggregated = string.Join(";", sharedSeedData);

            using (var hasher = SHA384.Create())
            {
                var hashedBytes = hasher.ComputeHash(Encoding.ASCII.GetBytes(aggregated));

                var size = hashedBytes.Count() / sizeof(int);
                var ints = new int[size];
                for (var index = 0; index < size; index++)
                {
                    ints[index] = BitConverter.ToInt32(hashedBytes, index * sizeof(int));
                }

                return ints;
            }
        }

        public static (IList<uint> seedArray, string seedHash) CreateSharedSeed(IEnumerable<string> sharedSeedData)
        {
            var aggregated = string.Join(";", sharedSeedData);

            using (var hasher = SHA384.Create())
            {
                var hashedBytes = hasher.ComputeHash(Encoding.ASCII.GetBytes(aggregated));

                string hex = HexConverter.ToHex(hashedBytes);
                var size = hashedBytes.Count() / sizeof(int);
                var ints = new uint[size];
                for (var index = 0; index < size; index++)
                {
                    ints[index] = BitConverter.ToUInt32(hashedBytes, index * sizeof(uint));
                }

                return (ints, hex);
            }
        }

        public static IList<int> CreateSharedSeed(IEnumerable<long> sharedSeedData)
        {
            var aggregatedBytes = sharedSeedData.SelectMany(x => BitConverter.GetBytes(x)).ToArray();

            using (var hasher = SHA384.Create())
            {
                var hashedBytes = hasher.ComputeHash(aggregatedBytes);

                var size = hashedBytes.Count() / sizeof(int);
                var ints = new int[size];
                for (var index = 0; index < size; index++)
                {
                    ints[index] = BitConverter.ToInt32(hashedBytes, index * sizeof(int));
                }

                return ints;
            }
        }
    }
}
