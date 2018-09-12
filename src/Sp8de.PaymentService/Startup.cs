using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sp8de.Common.Interfaces;
using Sp8de.DataModel;
using Sp8de.PaymentService.Models;
using Sp8de.PaymentService.Service;

namespace Sp8de.PaymentService
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
            services.AddEntityFrameworkNpgsql()
                    .AddDbContext<Sp8deDbContext>(x => x.UseNpgsql(Configuration.GetConnectionString("DefaultConnection")));

            services.AddTransient<IPaymentTransactionService, PaymentTransactionService>();

            services.Configure<PaymentGatewayConfig>(Configuration.GetSection(nameof(PaymentGatewayConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<PaymentGatewayConfig>>().Value);

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                //app.UseHsts();
                //app.UseHttpsRedirection();
            }

            app.UseMvc();
        }
    }
}
