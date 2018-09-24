using Sp8de.Common.BlockModels;
using System.Collections.Generic;
using System.Linq;

namespace Sp8de.Common.Interfaces
{
    public class CreateTransactionRequest
    {
        public Sp8deTransactionType Type { get; set; }
        public IList<InternalTransaction> InnerTransactions { get; set; }
        public string DependsOn { get; set; }
        public Dictionary<string, IList<string>> InputData { get; set; }

        public void AddExtended(Dictionary<string, IList<string>> extended)
        {
            if (InputData == null)
            {
                InputData = new Dictionary<string, IList<string>>();
            }

            if (extended != null)
            {
                foreach (var item in extended)
                {
                    InputData[$"{nameof(extended)}{item.Key}"] = item.Value;
                }
            }
        }

        public void AddOriginalRandomSettings(Dictionary<string, IList<string>> originalSettings)
        {
            if (InputData == null)
            {
                InputData = new Dictionary<string, IList<string>>();
            }
            var arr = new[] { "randomType", "randomCount", "randomAlgorithm", "randomRange" };

            if (originalSettings != null)
            {
                foreach (var item in originalSettings.Where(x => arr.Contains(x.Key)))
                {
                    InputData[item.Key] = item.Value;
                }
            }
        }

        public void AddRandomSettings(RandomSettings randomSettings)
        {
            if (InputData == null)
            {
                InputData = new Dictionary<string, IList<string>>();
            }

            InputData.Add("randomType", new List<string> { randomSettings.Type.ToString() });


            InputData.Add("randomCount", new List<string> { randomSettings.Count.ToString() });
            InputData.Add("randomAlgorithm", new List<string> { randomSettings.Algorithm.ToString() });


            if (randomSettings.RangeMin.HasValue && randomSettings.RangeMax.HasValue)
            {
                InputData["randomRange"] = new List<string> {
                        randomSettings.RangeMin.Value.ToString(),
                        randomSettings.RangeMax.Value.ToString()
                };
            }
        }
    }
}