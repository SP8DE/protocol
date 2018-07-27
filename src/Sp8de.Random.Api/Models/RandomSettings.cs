using Sp8de.Common.Enums;
using System.ComponentModel;

namespace Sp8de.Random.Api.Models
{
    public class RandomSettings
    {
        public RandomType Type { get; set; }
        public PRNGAlgorithmType Algorithm { get; set; }

        [DefaultValue(1)]
        public int Count { get; set; }

        public int? RangeMin { get; set; }
        public int? RangeMax { get; set; }
    }
}
