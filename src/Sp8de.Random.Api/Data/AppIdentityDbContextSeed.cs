using Microsoft.AspNetCore.Identity;
using Sp8de.DataModel;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Data
{
    public class AppIdentityDbContextSeed
    {
        public static async Task SeedAsync(UserManager<ApplicationUser> userManager)
        {
            var defaultUser = new ApplicationUser { UserName = "user@sp8de.com", Email = "user@sp8de.com", Id = Guid.Parse("c8665ddd-5297-4cb7-b0a8-aa27c94bb8cc") };
            await userManager.CreateAsync(defaultUser, "Pass@word1!");
        }
    }
}
