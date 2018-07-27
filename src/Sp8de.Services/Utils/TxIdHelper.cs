using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace Sp8de.Services.Utils
{
    public static class TxIdHelper
    {
        public static string GenerateId()
        {
            using (var hash = SHA256.Create())
            {
                return hash.ComputeHash(Guid.NewGuid().ToByteArray()).ToHex();
            }
        }

        public static byte[] CalculateHash(this byte[] bytes)
        {
            return SHA256.Create().ComputeHash(bytes);
        }

        public static string ToHex(this byte[] bytes)
        {
            char[] c = new char[bytes.Length * 2 + 2];

            byte b;

            c[0] = '0';
            c[1] = 'x';

            for (int bx = 0, cx = 2; bx < bytes.Length; ++bx, ++cx)
            {
                b = ((byte)(bytes[bx] >> 4));
                c[cx] = (char)(b > 9 ? b + 0x37 + 0x20 : b + 0x30);

                b = ((byte)(bytes[bx] & 0x0F));
                c[++cx] = (char)(b > 9 ? b + 0x37 + 0x20 : b + 0x30);
            }

            return new string(c);
        }

    }

}
