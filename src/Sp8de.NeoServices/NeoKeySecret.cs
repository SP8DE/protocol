using Sp8de.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.NeoServices
{
    public class NeoKeySecret : IKeySecret
    {
        public KeyType Type => KeyType.Neo;

        public string PrivateKey { get; set; }

        public string PublicAddress { get; set; }
    }
}
