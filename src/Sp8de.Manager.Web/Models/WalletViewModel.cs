using Sp8de.Common.Enums;

namespace Sp8de.Manager.Web.Models
{
    public class WalletViewModel
    {
        public string Address { get; set; }
        public Currency Currency { get; set; }
        public decimal Balance { get; set; }
        public bool TwoFactorEnabled { get; set; }
    }
}
