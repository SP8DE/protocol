using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Interfaces;
using Sp8de.Random.Api.Models;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RandomController : Controller
    {
        private readonly IPRNGRandomService randomService;

        public RandomController(IPRNGRandomService randomService)
        {
            this.randomService = randomService;
        }

        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [HttpPost("check")]
        public async Task<ActionResult<RandomCheckResponse>> Check([FromBody] RandomCheckRequest request)
        {
            var vm = new RandomCheckResponse();

            switch (request.Settings.Type)
            {
                case RandomType.Boolen:
                    vm.Numbers = randomService.Generate(request.SharedSeed,
                        request.Settings.Count,
                        0,
                        1,
                        request.Settings.Algorithm);
                    break;
                case RandomType.RepeatableNumber:
                    vm.Numbers = randomService.Generate(request.SharedSeed,
                        request.Settings.Count,
                        request.Settings.RangeMin.Value,
                        request.Settings.RangeMax.Value,
                        request.Settings.Algorithm);
                    break;
                case RandomType.UniqueNumber:
                    vm.Numbers = randomService.Generate(request.SharedSeed,
                        request.Settings.Count,
                        request.Settings.RangeMin.Value,
                        request.Settings.RangeMax.Value,
                        request.Settings.Algorithm);
                    break;
                case RandomType.Shuffle:

                    var rangeArray = Enumerable.Range(request.Settings.RangeMin.Value, request.Settings.RangeMax.Value).ToArray();
                    randomService.Shuffle(request.SharedSeed,
                    rangeArray,
                    request.Settings.Algorithm);
                    vm.Numbers = rangeArray;
                    break;
            }

            return vm;
        }
    }

    public class RandomCheckRequest
    {
        public List<int> SharedSeed { get; set; }
        public RandomSettings Settings { get; set; }
    }

    public class RandomCheckResponse
    {
        public IList<int> Numbers { get; set; }
    }
}