using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sp8de.DataModel;

namespace Sp8de.Manager.Web.Controllers
{
    public class TransactionController : Controller
    {
        private readonly Sp8deDbContext context;

        private Guid CurrentUserId { get { return User.GetUserId(); } }

        public TransactionController(Sp8deDbContext context)
        {
            this.context = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        public async Task<IActionResult> List()
        {
            var transactions = context.WalletTransactions
                          .Include(x => x.BlockchainTransaction)
                          .Where(x => x.Wallet.UserId == CurrentUserId)
                          .OrderByDescending(x => x.DateCreated)
                          .Select(x => new WalletTransactionViewModel()
                          {
                              Currency = x.Currency.ToString(),
                              Amount = x.Amount,
                              DateCreated = x.DateCreated,
                              Hash = x.BlockchainTransaction != null ? x.BlockchainTransaction.Hash : null,
                              Address = x.BlockchainTransaction != null ? x.BlockchainTransaction.Address : null
                          })
                          .ToListAsync();

            return Ok(transactions);
        }
    }

    public class WalletTransactionViewModel
    {
        public string Currency { get; internal set; }
        public decimal Amount { get; internal set; }
        public DateTime DateCreated { get; internal set; }
        public string Address { get; internal set; }
        public string Hash { get; internal set; }
    }

}