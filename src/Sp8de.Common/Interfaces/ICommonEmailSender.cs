using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface ICommonEmailSender
    {
        Task SendEmailAsync(string email, string subject, string htmlMessage, string textMessage);
    }
}
