using SecurityDriven.Inferno;
using System;

namespace Sp8de.Services
{
    static class RandomUtils
    {
        public static string GetRandomString(int length)
        {
            const string characterSet =
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                    "abcdefghijklmnopqrstuvwxyz" +
                    "0123456789";
            var characterArray = characterSet.ToCharArray();
            var bytes = new byte[length * 8];
            new CryptoRandom().NextBytes(bytes);
            var result = new char[length];
            for (int i = 0; i < length; i++)
            {
                ulong value = BitConverter.ToUInt64(bytes, i * 8);
                result[i] = characterArray[value % (uint)characterArray.Length];
            }
            return new string(result);
        }

        public static long RandomLong()
        {
            var rnd = new CryptoRandom();
            return rnd.NextLong();
        }
    }
}
