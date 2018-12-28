using Sp8de.Common.Utils.Models;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Sp8de.Common.Utils
{
    public static class SMTPHelper
    {
        public static string SMTP_SERVER = "";
        public static int SMTP_PORT = 587;
        public static string SMTP_LOGIN = "";
        public static string SMTP_PASSWORD = "";

        /// <summary>
        /// Send Mail via SMTP method
        /// </summary>
        /// <param name="model">SendMailModel contents all required params for sending mail</param>
        public static async Task<bool> SendMail(SendMailModel model)
        {
            try
            {
                MailMessage mail = new MailMessage();
                mail.From = new MailAddress(SMTP_LOGIN);
                mail.To.Add(new MailAddress(model.MailTo));
                mail.Subject = model.Subject;
                mail.IsBodyHtml = true;
                mail.Body = model.Message;

                if (!string.IsNullOrEmpty(model.AttachFile))
                    mail.Attachments.Add(new Attachment(model.AttachFile));

                SmtpClient client = new SmtpClient(SMTP_SERVER, SMTP_PORT);
                client.EnableSsl = true;
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(SMTP_LOGIN, SMTP_PASSWORD);
                client.DeliveryMethod = SmtpDeliveryMethod.Network;
                await client.SendMailAsync(mail);
                mail.Dispose();
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine(string.Format(@"Error message: {0}", e.Message));
                return false;
            }
        }

        static Regex ValidEmailRegex = CreateValidEmailRegex();

        /// <summary>
        /// Taken from http://haacked.com/archive/2007/08/21/i-knew-how-to-validate-an-email-address-until-i.aspx
        /// </summary>
        /// <returns></returns>
        private static Regex CreateValidEmailRegex()
        {
            string validEmailPattern = @"^(?!\.)(""([^""\r\\]|\\[""\r\\])*""|"
                + @"([-a-z0-9!#$%&'*+/=?^_`{|}~]|(?<!\.)\.)*)(?<!\.)"
                + @"@[a-z0-9][\w\.-]*[a-z0-9]\.[a-z][a-z\.]*[a-z]$";

            return new Regex(validEmailPattern, RegexOptions.IgnoreCase);
        }

        public static bool EmailIsValid(string emailAddress)
        {
            bool isValid = ValidEmailRegex.IsMatch(emailAddress);

            return isValid;
        }
    }
}
