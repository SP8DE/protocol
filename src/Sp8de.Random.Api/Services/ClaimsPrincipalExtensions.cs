using System;
using System.Security.Claims;

namespace Sp8de.Random.Api.Services
{
    public static class ClaimsPrincipalExtensions
    {
        public static Guid GetUserId(this ClaimsPrincipal principal)
        {
            if (principal == null)
                throw new ArgumentNullException(nameof(principal));

            return Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier));
        }
    }
}
