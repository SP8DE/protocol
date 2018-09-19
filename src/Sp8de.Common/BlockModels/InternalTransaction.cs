using System.Text;

namespace Sp8de.Common.BlockModels
{
    public class InternalTransaction
    {
        public string Hash { get; set; }
        public Sp8deTransactionType Type { get; set; }
        public string From { get; set; }
        public string Sign { get; set; }
        public string Nonce { get; set; }
        /// <summary>
        /// Seed Item
        /// </summary>
        public string Data { get; set; }

        public string GetDataForSign()
        {
            return $"{From.ToLower()};{Data};{Nonce}";
        }

        public byte[] GetBytes()
        {
            return Encoding.UTF8.GetBytes($"{this.Type};{this.From};{this.Nonce};{this.Sign}");
        }
    }
}
