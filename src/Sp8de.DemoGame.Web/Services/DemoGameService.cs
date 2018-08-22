using Sp8de.Common.Interfaces;
using System;
using System.Security.Cryptography;

namespace Sp8de.DemoGame.Web.Services
{
    public class DemoGameService : IGameService
    {

    }

    public class RNGRandomGenerator : IRandomNumberGenerator
    {
        public long NextLong()
        {
            using (RNGCryptoServiceProvider rand = new RNGCryptoServiceProvider())
            {
                byte[] four_bytes = new byte[8];
                rand.GetBytes(four_bytes);

                return BitConverter.ToInt64(four_bytes, 0);
            }
        }
    }
}
