// <auto-generated>
// Code generated by Microsoft (R) AutoRest Code Generator.
// Changes may cause incorrect behavior and will be lost if the code is
// regenerated.
// </auto-generated>

namespace Sp8de.Protocol.Client.Models
{
    using Newtonsoft.Json;
    using System.Linq;

    public partial class NodeInfo
    {
        /// <summary>
        /// Initializes a new instance of the NodeInfo class.
        /// </summary>
        public NodeInfo()
        {
            CustomInit();
        }

        /// <summary>
        /// Initializes a new instance of the NodeInfo class.
        /// </summary>
        public NodeInfo(string key = default(string), string url = default(string))
        {
            Key = key;
            Url = url;
            CustomInit();
        }

        /// <summary>
        /// An initialization method that performs custom operations like setting defaults
        /// </summary>
        partial void CustomInit();

        /// <summary>
        /// </summary>
        [JsonProperty(PropertyName = "key")]
        public string Key { get; set; }

        /// <summary>
        /// </summary>
        [JsonProperty(PropertyName = "url")]
        public string Url { get; set; }

    }
}
