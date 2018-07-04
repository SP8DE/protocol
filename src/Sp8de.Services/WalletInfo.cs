using Sp8de.Common.Enums;
using System;

namespace Sp8de.Services
{
    public class WalletInfo
    {
        public Guid WalletId { get; set; }
        public string GatewayCode { get; set; }
        public Currency Currency { get; set; }
        public string Address { get; set; }
    }
}
