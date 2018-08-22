using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Sp8de.Common.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Controllers
{

    public class RegisterInputModel
    {
        [Required]
        [EmailAddress]
        [Display(Name = "Email")]
        public string Email { get; set; }

        [Required]
        [StringLength(100, ErrorMessage = "The {0} must be at least {2} and at max {1} characters long.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; }

        [DataType(DataType.Password)]
        [Display(Name = "Confirm password")]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; }
    }

    public class AccountInputModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        [Display(Name = "Remember me?")]
        public bool RememberMe { get; set; }
    }

    public static class JwtTokenGenerator
    {
        public static string Generate(string name, string issuer, string key)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer,
                issuer,
                claims,
                expires: DateTime.Now.AddDays(30),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly SignInManager<IdentityUser> signInManager;
        private readonly IConfiguration configuration;
        private readonly ILogger<AccountController> logger;
        private readonly UserManager<IdentityUser> userManager;

        public AccountController(SignInManager<IdentityUser> signInManager, IConfiguration configuration, ILogger<AccountController> logger, UserManager<IdentityUser> userManager)
        {
            this.signInManager = signInManager;
            this.configuration = configuration;
            this.logger = logger;
            this.userManager = userManager;
        }


        [HttpPost("register")]
        public async Task<ActionResult<string>> Register(RegisterInputModel model)
        {
            if (ModelState.IsValid)
            {
                var user = new IdentityUser { UserName = model.Email, Email = model.Email };
                var result = await userManager.CreateAsync(user, model.Password);
                if (result.Succeeded)
                {
                    logger.LogInformation("User created a new account with password.");

                    var jwt = JwtTokenGenerator.Generate(model.Email, configuration["AuthToken:Issuer"], configuration["AuthToken:Key"]);
                    logger.LogInformation("User logged in.");
                    return jwt;
                }

                return BadRequest(result.Errors.Select(x => new Error()
                {
                    Name = string.Empty,
                    Message = x.Description
                }
                ).ToList());
            }

            return BadRequest();
        }

        [HttpPost("login")]
        public async Task<ActionResult<string>> Login(AccountInputModel Input)
        {
            if (ModelState.IsValid)
            {
                // This doesn't count login failures towards account lockout
                // To enable password failures to trigger account lockout, set lockoutOnFailure: true
                var result = await signInManager.PasswordSignInAsync(Input.Email, Input.Password, Input.RememberMe, lockoutOnFailure: false);

                if (result.Succeeded)
                {
                    var jwt = JwtTokenGenerator.Generate(Input.Email, configuration["AuthToken:Issuer"], configuration["AuthToken:Key"]);
                    logger.LogInformation("User logged in.");
                    return jwt;
                }

                if (result.RequiresTwoFactor)
                {
                    return BadRequest(new List<Error>() { new Error() { Name = "2fa", Message = "Require LoginWith 2fa" } });
                }
                if (result.IsLockedOut)
                {
                    return BadRequest(new List<Error>() { new Error() { Name = "Lockout", Message = "User account locked out" } });
                }
                else
                {
                    return BadRequest(new List<Error>() { new Error() { Name = "InvalidLogin", Message = "Invalid login attempt." } });
                }
            }

            return BadRequest(ModelState);
        }
    }
}
