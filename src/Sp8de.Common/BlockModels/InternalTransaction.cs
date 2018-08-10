namespace Sp8de.Common.BlockModels
{
    public class InternalTransaction
    {
        public string Hash { get; set; }
        public Sp8deTransactionType Type { get; set; }
        public string From { get; set; }
        public string Sign { get; set; }
        public long Nonce { get; set; }
        /// <summary>
        /// Seed Item
        /// </summary>
        public long? Data { get; set; }
    }
}
