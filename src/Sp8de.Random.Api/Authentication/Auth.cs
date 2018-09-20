//using System.Collections.Generic;
//using System.Linq;
//using System.Security.Claims;

//namespace Sp8de.Random.Api.Authentication
//{

//	public static class PrincipalFactory
//	{
//		private const string Issuer = "urn:microsoft.example";
//		private const string AuthenticationType = "bearer";

//		private static List<ClaimsPrincipal> _principals;

//		static PrincipalFactory()
//		{
//			_principals = new List<ClaimsPrincipal>();

//			_principals.Add(new ClaimsPrincipal(new ClaimsIdentity(new List<Claim>
//			{
//				new Claim(ClaimTypes.Name, "APIKEY1", ClaimValueTypes.String, Issuer)
//			}, AuthenticationType)));

//			_principals.Add(new ClaimsPrincipal(new ClaimsIdentity(new List<Claim>
//			{
//				new Claim(ClaimTypes.Name, "APIKEY2", ClaimValueTypes.String, Issuer)
//			}, AuthenticationType)));
//		}

//		public static ClaimsPrincipal Get(string username)
//		{
//			var principals =
//				(from p in _principals
//				 where
//					 p.Claims.Any(c => c.Type == ClaimTypes.Name && c.Value == username)
//				 select p);

//			return principals.FirstOrDefault();
//		}

//		public static IEnumerable<string> UserNames
//		{
//			get
//			{
//				return from p in _principals
//					   from c in p.Claims
//					   where c.Type == ClaimTypes.Name
//					   select c.Value;
//			}
//		}
//	}

//}
