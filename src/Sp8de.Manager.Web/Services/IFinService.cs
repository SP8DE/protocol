using Sp8de.Manager.Web.Models;
using System;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Services
{
    public interface IFinService
    {
        Task<(Guid requestId, string withdrawalCode)> CreateWithdrawalRequest(CreateWithdrawalRequestModel model);
    }
}
