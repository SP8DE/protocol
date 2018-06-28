using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Sp8de.Services
{
    public class RandomHelpers
    {
        public static IList<uint> CreateSharedSeed(string[] sharedSeedData)
        {
            var aggregated = string.Join("", sharedSeedData);

            var hasher = SHA384.Create();
            var hashedBytes = hasher.ComputeHash(Encoding.ASCII.GetBytes(aggregated));

            var size = hashedBytes.Count() / sizeof(int);
            var ints = new uint[size];
            for (var index = 0; index < size; index++)
            {
                ints[index] = BitConverter.ToUInt32(hashedBytes, index * sizeof(int));
            }

            return ints;
        }

        public static long RandomLong()
        {
            using (RNGCryptoServiceProvider rand = new RNGCryptoServiceProvider())
            {
                byte[] four_bytes = new byte[8];
                rand.GetBytes(four_bytes);

                // Convert that into an uint.
                return BitConverter.ToInt64(four_bytes, 0);
            }
        }

        public static long RandomLong2()
        {
            
            using (RNGCryptoServiceProvider rand = new RNGCryptoServiceProvider())
            {
                byte[] four_bytes = new byte[8];
                rand.GetBytes(four_bytes);

                // Convert that into an uint.
                return BitConverter.ToInt64(four_bytes, 0);
            }
        }

        
    }
}
