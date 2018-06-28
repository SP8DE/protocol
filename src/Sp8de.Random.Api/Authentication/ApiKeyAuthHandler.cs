using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Sp8de.Common.Interfaces;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Authentication
{
    public class ApiKeyAuthHandler : AuthenticationHandler<ApiKeyAuthOptions>
    {
        private readonly IApiKeyProvider apiKeyProvider;
        private readonly ILoggerFactory logger;

        public ApiKeyAuthHandler(IOptionsMonitor<ApiKeyAuthOptions> options, IApiKeyProvider apiKeyProvider, ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock) : base(options, logger, encoder, clock)
        {
            this.apiKeyProvider = apiKeyProvider;
            this.logger = logger;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            // Get Authorization header value
            if (!Request.Headers.TryGetValue(HeaderNames.Authorization, out var authorization))
            {
                return AuthenticateResult.Fail($"Cannot read {HeaderNames.Authorization} header.");
            }

            var apiKey = authorization.First().Split(" ").Last();

            var apiKeyItem = await apiKeyProvider.Get(apiKey);
            if (apiKeyItem == null)
            {
                return AuthenticateResult.Fail("ApiKey not found");
            }

            var identities = new List<ClaimsIdentity>
            {
                new ClaimsIdentity(
                        new List<Claim>
                        {
                            new Claim(ClaimTypes.Name, apiKey, ClaimValueTypes.String),
                            new Claim(ClaimTypes.NameIdentifier, apiKeyItem.ApiKeyId.ToString(), ClaimValueTypes.Integer),
                            new Claim(ClaimTypes.UserData, apiKeyItem.UserId.ToString(), ClaimValueTypes.String),
                        },
                    ApiKeyAuthOptions.DefaultScheme
                )
            };

            var ticket = new AuthenticationTicket(new ClaimsPrincipal(identities), Options.Scheme);

            return AuthenticateResult.Success(ticket);
        }
    }

}
