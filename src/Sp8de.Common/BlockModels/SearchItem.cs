namespace Sp8de.Common.BlockModels
{
    public class SearchItem
    {
        public SearchItemType Type { get; set; }
        public string Hash { get; set; }
        public long? BlockId { get; set; }
        public Sp8deTransactionType TransactionType { get; set; }
        public long Timestamp { get; set; }
    }
}
