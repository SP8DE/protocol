using Sp8de.Common.BlockModels;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Models
{
    public class ValidateRandomRequest
    {
        public IList<uint> SharedSeed { get; set; }
        public RandomSettings Settings { get; set; }
    }
}