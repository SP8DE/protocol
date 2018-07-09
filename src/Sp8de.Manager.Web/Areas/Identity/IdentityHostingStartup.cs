using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.UI;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

[assembly: HostingStartup(typeof(Sp8de.Manager.Web.Areas.Identity.IdentityHostingStartup))]
namespace Sp8de.Manager.Web.Areas.Identity
{
    public class IdentityHostingStartup : IHostingStartup
    {
        public void Configure(IWebHostBuilder builder)
        {

            //builder.ConfigureServices((context, services) => {
            //    services.AddDbContext<IdentityDbContext>(options =>
            //        options.UseSqlServer(
            //            context.Configuration.GetConnectionString("IdentityScaffoldIdentityDbContextConnection")));

            //    services.AddDefaultIdentity<ApplicationUser>()
            //        .AddEntityFrameworkStores<IdentityDbContext>();
            //});

            builder.ConfigureServices((context, services) => {

            });
        }
    }
}