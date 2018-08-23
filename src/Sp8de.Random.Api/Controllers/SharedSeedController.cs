using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using Sp8de.Random.Api.Models;
using Sp8de.Random.Api.Services;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SharedSeedController : ControllerBase
    {
        private readonly ISharedSeedService sharedSeedService;

        public SharedSeedController(ISharedSeedService sharedSeedService)
        {
            this.sharedSeedService = sharedSeedService;
        }

        // GET api/values/5
        [HttpGet("{id}")]
        public ActionResult<RevealResponse> Get(string id)
        {
            //var result = sharedSeedService.Reveal(request.SharedSeedId, request.Items);

            var response = new RevealResponse()
            {
                Body = new RevealResponseBody()
                {
                    Items = new List<RevealItem>(),
                    SeedData = null
                },
                Header = new ResponseHeader()
                {
                    RevealSeedDataHash = "TODO",
                }
            };

            return response;
        }

        // POST api/values
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [HttpPost("commit")]
        public async Task<ActionResult<CommitResponse>> Commit([FromBody] CommitRequest request)
        {
            var result = sharedSeedService.AggregatedCommit(request.Items);

            var response = new CommitResponse()
            {
                Header = new ResponseHeader
                {
                    SeedDataId = result.Id,
                },
                Body = new CommitBody()
                {
                    SharedSeedId = result.Id,
                    MetaData = result.MetaData,
                    Items = result.Items.Select(x => new CommitItem() { PubKey = x.PubKey }).ToList(),
                    IsSuccess = true
                }
            };

            return response;
        }

        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [HttpPost("reveal")]
        public async Task<ActionResult<RevealResponse>> Reveal([FromBody] RevealRequest request)
        {
            var result = sharedSeedService.Reveal(request.SharedSeedId, request.Items);

            var response = new RevealResponse()
            {
                Body = new RevealResponseBody()
                {
                    Items = result.Items,
                    SeedData = result.SharedSeed
                },
                Header = new ResponseHeader()
                {
                    RevealSeedDataHash = "TODO",
                }
            };

            return response;
        }
    }

}
