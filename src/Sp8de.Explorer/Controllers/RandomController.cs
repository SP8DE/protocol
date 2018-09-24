using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Interfaces;
using Sp8de.Random.Api.Models;
using System;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/random")]
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
        [HttpPost("validate")]
        public ActionResult<ValidateRandomResponse> Validate(ValidateRandomRequest request)
        {
            try
            {
                IList<int> randomNumbers = randomService.GetVerifiableRandomNumbers(request.SharedSeed, request.Settings);

                return new ValidateRandomResponse()
                {
                    Numbers = randomNumbers
                };
            }
            catch (ArgumentException e)
            {
                throw e;
            }
        }
    }
}