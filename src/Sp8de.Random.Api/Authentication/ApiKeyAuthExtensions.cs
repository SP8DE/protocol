using Microsoft.AspNetCore.Authentication;
using System;

namespace Sp8de.Random.Api.Authentication
{
	public static class ApiKeyAuthExtensions
	{
		public static AuthenticationBuilder AddApiKeyAuth(this AuthenticationBuilder builder, Action<ApiKeyAuthOptions> configureOptions)
		{
			return builder.AddScheme<ApiKeyAuthOptions, ApiKeyAuthHandler>(ApiKeyAuthOptions.DefaultScheme, configureOptions);
		}
	}
}
