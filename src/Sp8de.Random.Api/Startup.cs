using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.DataModel;
using Sp8de.EthServices;
using Sp8de.IpfsStorageService;
using Sp8de.Random.Api.Authentication;
using Sp8de.Random.Api.Models;
using Sp8de.Random.Api.Services;
using Sp8de.RandomGenerators;
using Sp8de.Services;
using Sp8de.Services.Protocol;

namespace Sp8de.Random.Api
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
            /*
            services.AddEntityFrameworkNpgsql()
                    .AddDbContext<Sp8deDbContext>(x => x.UseNpgsql(
                        Configuration.GetConnectionString("DefaultConnection")
                        ));
            */

            services.AddDbContext<Sp8deDbContext>(options => options.UseInMemoryDatabase("AuthTests"));

            services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = actionContext =>
                {
                    var errors = actionContext.ModelState
                        .Where(e => e.Value.Errors.Count > 0)
                        .Select(e => new Error
                        {
                            Name = e.Key,
                            Message = e.Value.Errors.First().ErrorMessage
                        }).ToArray();

                    return new BadRequestObjectResult(errors);
                };
            });

            services.Configure<RouteOptions>(options => options.LowercaseUrls = true);

            services.Configure<RandomApiConfig>(Configuration.GetSection(nameof(RandomApiConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<RandomApiConfig>>().Value);


            services.AddTransient<IApiKeyProvider, ApiKeyProvider>();
            services.AddTransient<ProtocolService>();
            services.AddTransient<IPRNGRandomService, PRNGRandomService>();
            services.AddTransient<IWalletService, WalletService>();            

            services.AddTransient<ISp8deTransactionStorage, Sp8deTransactionStorage>();
            services.AddTransient<ISp8deTransactionNodeService, Sp8deTransactionNodeService>();

            services.AddTransient<IExternalAnchorService, IpfsExternalAnchorService>();
            services.AddTransient<IpfsFileStorageService>();
            services.Configure<IpfsStorageConfig>(Configuration.GetSection(nameof(IpfsStorageConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<IpfsStorageConfig>>().Value);

            services.AddTransient<ICryptoService, EthCryptoService>();
            services.AddTransient<IRandomNumberGenerator, RNGRandomGenerator>();
            services.AddTransient<IRandomContributorService, RandomContributorService>();           

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);

            services.AddSwaggerGen(c =>
            {
                c.DescribeAllParametersInCamelCase();
                //c.DescribeStringEnumsInCamelCase();
                c.DescribeAllEnumsAsStrings();
                c.SwaggerDoc("v1", new Swashbuckle.AspNetCore.Swagger.Info() { Title = "Sp8de API", Version = "v1" });
                c.OperationFilter<AuthorizationHeaderParameterOperationFilter>();
            });

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = ApiKeyAuthOptions.DefaultScheme;
                options.DefaultChallengeScheme = ApiKeyAuthOptions.DefaultScheme;
            })
            .AddApiKeyAuth(o => { });
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
                app.UseHsts();
            }

            app.UseSwagger(c =>
            {
                c.PreSerializeFilters.Add((document, request) =>
                {
                    var paths = document.Paths.ToDictionary(item => item.Key.ToLowerInvariant(), item => item.Value);
                    document.Paths.Clear();
                    foreach (var pathItem in paths)
                    {
                        document.Paths.Add(pathItem.Key, pathItem.Value);
                    }
                });
            });

            app.UseAuthentication();

            app.UseHttpsRedirection();

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sp8de API V1");
            });

            app.UseMvc();
        }
    }
}
