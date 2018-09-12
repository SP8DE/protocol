using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sp8de.DataModel;
using Sp8de.Manager.Web.Models;

namespace Sp8de.Manager.Web.Controllers
{
    [Authorize]
    public class TransactionController : Controller
    {
        private readonly Sp8deDbContext context;

        private Guid CurrentUserId { get { return User.GetUserId(); } }

        public TransactionController(Sp8deDbContext context)
        {
            this.context = context;
        }

        public async Task<IActionResult> Index()
        {
            var transactions = await GetTransactions();

            var vm = new WalletTransactionsViewModel()
            {
                Transactions = transactions
            };

            return View(vm);
        }

        private async Task<List<WalletTransactionViewModel>> GetTransactions()
        {
            return await context.WalletTransactions
              .Include(x => x.BlockchainTransaction)
              .Where(x => x.Wallet.UserId == CurrentUserId)
              .OrderByDescending(x => x.DateCreated)
              .Select(x => new WalletTransactionViewModel()
              {
                  Type = x.Type,
                  Status = x.Status,
                  Currency = x.Currency,
                  Amount = x.Amount,
                  TransactionInfo = new Common.Models.PaymentTransactionInfo() {
                      TransactionHash = x.BlockchainTransaction != null ? x.BlockchainTransaction.Hash : null
                  },
                  DateCreated = x.DateCreated,
                  Hash = x.BlockchainTransaction != null ? x.BlockchainTransaction.Hash : null,
                  Address = x.BlockchainTransaction != null ? x.BlockchainTransaction.Address : null
              })
              .ToListAsync();
        }

        public async Task<IActionResult> List()
        {
            var transactions = await GetTransactions();
            return Ok(transactions);
        }
    }

}
