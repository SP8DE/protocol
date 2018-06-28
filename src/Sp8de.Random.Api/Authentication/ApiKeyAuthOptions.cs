using Microsoft.AspNetCore.Authentication;
using System.Collections.Generic;

namespace Sp8de.Random.Api.Authentication
{
    public class ApiKeyAuthOptions : AuthenticationSchemeOptions
	{
		public const string DefaultScheme = "ApiKey";

		public string Scheme => DefaultScheme;
		public Dictionary<string, int> ApiKeys { get; set; }
		public ApiKeyAuthOptions()
		{

		}
	}

}
