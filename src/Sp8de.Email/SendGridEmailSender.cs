using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;
using Sp8de.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.Email
{
    public class SendGridEmailSender : ICommonEmailSender
    {
        private readonly ILogger<ICommonEmailSender> logger;
        private readonly SendGridApiConfig config;

        public SendGridEmailSender(ILogger<ICommonEmailSender> logger, SendGridApiConfig config)
        {
            this.logger = logger;
            this.config = config;
        }

        public async Task SendEmailAsync(string email, string subject, string htmlMessage, string textMessage)
        {
            var client = new SendGridClient(config.ApiKey);

            var from = new EmailAddress(config.FromEmail, config.FromEmailName);

            var list = new List<EmailAddress> {
                new EmailAddress(email)
            };

            if (!string.IsNullOrEmpty(config.BccEmail))
            {
                list.Add(new EmailAddress(config.BccEmail));
            }

            var msg = MailHelper.CreateSingleEmailToMultipleRecipients(from, list, subject, textMessage, htmlMessage);
            var response = await client.SendEmailAsync(msg);
        }
    }
}
