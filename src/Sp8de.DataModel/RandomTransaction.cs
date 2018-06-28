using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.DataModel
{
    public class RandomTransaction
    {
        public Guid Id { get; set; }
        public int Type { get; set; }
        public int Version { get; set; }
        public int UserApiKeyId { get; set; }
        public DateTime DateCreated { get; set; }
        public DateTime? LastUpdated { get; set; }
        public RandomTransactionStatus Status { get; set; }
        public string Body { get; set; }
    }

    public enum RandomTransactionStatus
    {
        New = 0,
        InProgress = 1,
        Compleated = 2,
        Canceled = 4,
        Error = 8,
    }
}
