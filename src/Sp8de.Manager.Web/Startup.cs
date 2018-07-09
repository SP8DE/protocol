using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sp8de.DataModel;
using Sp8de.Common.Interfaces;
using Sp8de.Services;
using Microsoft.Extensions.Options;
using Sp8de.Manager.Web.Services;
using Microsoft.AspNetCore.Identity.UI.Services;

namespace Sp8de.Manager.Web
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.None;
            });

            services.AddDbContext<Sp8deDbContext>(c =>
                c.UseInMemoryDatabase("Sp8de"));

            /*
            services.AddDbContext<Sp8deDbContext>(options =>
                options.UseNpgsql(Configuration.GetConnectionString("DefaultConnection"))
            );*/

            services.AddDefaultIdentity<ApplicationUser>(o => {
                o.Password.RequireNonAlphanumeric = false;
                o.SignIn.RequireConfirmedEmail = false;
            })
            .AddEntityFrameworkStores<Sp8deDbContext>();

            
            services.AddTransient<IBlockchainDepositAddressService, BlockchainDepositAddressService>();
            services.AddTransient<IPaymentAddressService, SpxPaymentAddressService>();
            services.AddTransient<IFinService, FinService>();

            services.Configure<SpxPaymentGatewayConfig>(Configuration.GetSection(nameof(SpxPaymentGatewayConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<SpxPaymentGatewayConfig>>().Value);

            services.AddTransient<IApiKeyManager, ApiKeyManager>();

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);

            //services.AddSingleton<IEmailSender, EmailSender>();
            //services.Configure<AuthMessageSenderOptions>(Configuration);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseDatabaseErrorPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseCookiePolicy();

            app.UseAuthentication();

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
