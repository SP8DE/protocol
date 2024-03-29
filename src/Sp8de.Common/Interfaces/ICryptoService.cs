﻿using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Interfaces
{
    public interface ICryptoService
    {
        string SignMessage(string message, string privateKey);
        bool VerifySignature(string message, string signature, string pubKey);
        byte[] CalculateHash(byte[] value);
    }
}
