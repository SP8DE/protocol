using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class RandomCheckRequest
    {
        public IList<uint> SharedSeed { get; set; }
        public RandomSettings Settings { get; set; }
    }
}