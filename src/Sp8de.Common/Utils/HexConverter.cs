using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Utils
{
    public class HexConverter
    {
        public static string ToHex(byte[] bytes)
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
