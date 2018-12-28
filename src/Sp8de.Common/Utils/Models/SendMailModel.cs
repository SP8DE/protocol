using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Utils.Models
{
    /// <summary>
    /// Model for SMTP mail sending properties
    /// </summary>
    public class SendMailModel
    {
        /// <summary>
        /// SMTP server address
        /// </summary>
        public string SmtpServer { get; set; }
        /// <summary>
        /// SMTP Server Port
        /// </summary>
        public int SmtpServerPort { get; set; }
        /// <summary>
        /// SMTP server password
        /// </summary>
        public string Password { get; set; }
        /// <summary>
        /// E-mail sender address
        /// </summary>
        public string From { get; set; }
        /// <summary>
        /// E-mail receiver address
        /// </summary>
        public string MailTo { get; set; }
        /// <summary>
        /// E-mail subject
        /// </summary>
        public string Subject { get; set; }
        /// <summary>
        /// E-mail body message
        /// </summary>
        public string Message { get; set; }
        /// <summary>
        /// E-mail attach file content
        /// </summary>
        public string AttachFile { get; set; }
    }
}
