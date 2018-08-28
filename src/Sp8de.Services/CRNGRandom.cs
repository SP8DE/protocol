using Sp8de.Common.Interfaces;
using System;
using System.Security.Cryptography;

namespace Sp8de.Services
{
    public class CRNGRandom : IRandomNumberGenerator
    {
        public long NextLong()
        {
            var arr = new byte[8];

            RandomNumberGenerator.Fill(new Span<byte>(arr));
            var aaa = BitConverter.ToInt64(arr, 0);

            return aaa;
        }

    }
}
