// <auto-generated>
// Code generated by Microsoft (R) AutoRest Code Generator.
// Changes may cause incorrect behavior and will be lost if the code is
// regenerated.
// </auto-generated>

namespace Sp8de.Protocol.Client.Models
{
    using Newtonsoft.Json;
    using System.Linq;

    public partial class RandomSettings
    {
        /// <summary>
        /// Initializes a new instance of the RandomSettings class.
        /// </summary>
        public RandomSettings()
        {
            CustomInit();
        }

        /// <summary>
        /// Initializes a new instance of the RandomSettings class.
        /// </summary>
        /// <param name="type">Possible values include: 'RepeatableNumber',
        /// 'Boolen', 'Dice', 'UniqueNumber', 'Shuffle'</param>
        /// <param name="algorithm">Possible values include: 'MT19937',
        /// 'XorShift128'</param>
        public RandomSettings(string type = default(string), string algorithm = default(string), int? count = default(int?), int? rangeMin = default(int?), int? rangeMax = default(int?))
        {
            Type = type;
            Algorithm = algorithm;
            Count = count;
            RangeMin = rangeMin;
            RangeMax = rangeMax;
            CustomInit();
        }

        /// <summary>
        /// An initialization method that performs custom operations like setting defaults
        /// </summary>
        partial void CustomInit();

        /// <summary>
        /// Gets or sets possible values include: 'RepeatableNumber', 'Boolen',
        /// 'Dice', 'UniqueNumber', 'Shuffle'
        /// </summary>
        [JsonProperty(PropertyName = "type")]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets possible values include: 'MT19937', 'XorShift128'
        /// </summary>
        [JsonProperty(PropertyName = "algorithm")]
        public string Algorithm { get; set; }

        /// <summary>
        /// </summary>
        [JsonProperty(PropertyName = "count")]
        public int? Count { get; set; }

        /// <summary>
        /// </summary>
        [JsonProperty(PropertyName = "rangeMin")]
        public int? RangeMin { get; set; }

        /// <summary>
        /// </summary>
        [JsonProperty(PropertyName = "rangeMax")]
        public int? RangeMax { get; set; }

    }
}