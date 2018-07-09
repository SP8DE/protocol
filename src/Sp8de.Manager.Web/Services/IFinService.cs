using Sp8de.Manager.Web.Controllers;
using System;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Services
{
    public interface IFinService
    {
        (Guid, string) CreateWithdrawalRequest(CreateWithdrawalRequestModel model);
        Task<bool> ConfirmWithdrawalRequestByCode(Guid requestId, string code);
    }
}
