using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.Random.Api.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TransactionController : ControllerBase
    {
        private readonly ProtocolService protocolService;
        private readonly ICryptoService cryptoService;
        private readonly ISp8deTransactionStorage transactionStorage;

        public TransactionController(ProtocolService protocolService, ICryptoService cryptoService, ISp8deTransactionStorage transactionStorage)
        {
            this.protocolService = protocolService;
            this.cryptoService = cryptoService;
            this.transactionStorage = transactionStorage;
        }

        // GET api/transaction/0x
        [ProducesResponseType(404)]
        [HttpGet("{id}")]
        public async Task<ActionResult<Sp8deTransaction>> Get(string id)
        {
            var rs = await transactionStorage.Get(id);
            if (rs == null)
            {
                return NotFound();
            }
            return rs;
        }

        private UserInfo GetUserInfo()
        {
            return new UserInfo
            {
                UserId = User.GetUserId(),
                ApiKey = User.GetUserApiKey(),
                ApiKeyId = User.GetUserApiKeyId()
            };
        }

        [ProducesResponseType(200)]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [HttpPost("commit")]
        public async Task<ActionResult<Sp8deTransaction>> Commit([FromBody] ProtocolTransaction request)
        {
            var result = await protocolService.AggregatedCommit(request, GetUserInfo());
            return result;
        }

        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(400, Type = typeof(List<Error>))]
        [HttpPost("reveal")]
        public async Task<ActionResult<Sp8deTransaction>> Reveal([FromBody] ProtocolTransaction request)
        {
            var original = await transactionStorage.Get(request.DependsOn);
            if (original == null)
            {
                return NotFound();
            }

            foreach (var item in request.Items)
            {
                if (!cryptoService.VerifySignature(item.ToString(), item.Sign, item.PubKey))
                {
                    return BadRequest($"Invalid signature for {item.PubKey}");
                }
            }

            return await protocolService.AggregatedReveal(request, GetUserInfo(), original);
        }
    }
}
