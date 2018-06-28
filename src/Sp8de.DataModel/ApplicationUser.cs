using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.DataModel
{
    public class ApplicationUser : IdentityUser<Guid>
    {
        //public string Firstname { get; set; }
        //public string Middlename { get; set; }
        //public string Lastname { get; set; }
        //public string Country { get; set; }
        public string Company { get; set; }
        public DateTime RegDate { get; set; }

        public ICollection<Wallet> Wallets { get; set; }
        public ICollection<UserApiKey> UserApiKeys { get; set; }
        
        public ICollection<BlockchainAddress> BlockchainAddresses { get; set; }
        public ICollection<WalletTransaction> WalletTransactions { get; set; }
    }
}
