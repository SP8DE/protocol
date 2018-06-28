using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Interfaces
{
    public interface ISignService
    {
        string SignMessage(string message, string privateKey, string pubKey);
        bool VerifySignature(string message, string signature, string pubKey);
    }
}
