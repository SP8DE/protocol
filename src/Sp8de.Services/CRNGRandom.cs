using Sp8de.Common.Interfaces;
using System;
using System.Security.Cryptography;

namespace Sp8de.Services
{
    public class CRNGRandom : IRandomNumberGenerator
    {
        public long NextLong()
        {
            Span<byte> arr = new byte[8];
            RandomNumberGenerator.Fill(arr);
            return BitConverter.ToInt64(arr);
        }

        public int NextInt()
        {
            Span<byte> arr = new byte[4];
            RandomNumberGenerator.Fill(arr);
            return BitConverter.ToInt32(arr);
        }
    }
}
