using Sp8de.Manager.Web.Controllers;
using Sp8de.Manager.Web.Models;
using System;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Services
{
    public class FinService : IFinService
    {
        public Task<bool> ConfirmWithdrawalRequestByCode(Guid requestId, string code)
        {
            throw new NotImplementedException();
        }

        public (Guid, string) CreateWithdrawalRequest(CreateWithdrawalRequestModel model)
        {
            throw new NotImplementedException();
        }
    }
}
