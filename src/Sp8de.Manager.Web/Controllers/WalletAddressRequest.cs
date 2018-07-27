using Sp8de.Common.Enums;
using System.ComponentModel.DataAnnotations;

namespace Sp8de.Manager.Web.Controllers
{
    public class WalletAddressRequest
    {
        [Required]
        public Currency Currency { get; set; }
    }
}
