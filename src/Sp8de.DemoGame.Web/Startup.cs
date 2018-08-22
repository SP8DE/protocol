using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Sp8de.Common.Interfaces;
using Sp8de.DemoGame.Web.Data;
using Sp8de.DemoGame.Web.Infrastructure;
using Sp8de.DemoGame.Web.Models;
using Sp8de.DemoGame.Web.Services;
using Sp8de.EthServices;
using Sp8de.IpfsStorageService;
using Sp8de.RandomGenerators;
using Sp8de.Storage;
using System;
using System.Linq;
using System.Text;

namespace Sp8de.DemoGame.Web
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
            services.AddCors();

            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.None;
            });

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

            services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase("AuthTests"));

            ConfigureIdentity(services);

            services.Configure<DemoGameConfig>(Configuration.GetSection(nameof(DemoGameConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<DemoGameConfig>>().Value);
            services.AddTransient<IRandomContributorService, DemoGameRandomService>();

            services.AddSingleton<IGenericDataStorage, InMemoryDataStorage>(); //DEV
            services.AddTransient<IPRNGRandomService, PRNGRandomService>();
            services.AddScoped<ISignService, EthSignService>();
            services.AddTransient<IRandomNumberGenerator, RNGRandomGenerator>();
            services.AddScoped<IKeySecretManager, EthKeySecretManager>();

            services.Configure<ChaosProtocolConfig>(Configuration.GetSection(nameof(ChaosProtocolConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<ChaosProtocolConfig>>().Value);
            services.AddTransient<IChaosProtocolService, DemoProtocolService>();

            services.Configure<IpfsStorageConfig>(Configuration.GetSection(nameof(IpfsStorageConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<IpfsStorageConfig>>().Value);

            services.AddTransient<IpfsFileStorageService>();

            services.AddMemoryCache();

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);

            services.AddSwaggerGen(c =>
            {
                c.DescribeAllParametersInCamelCase();
                c.DescribeAllEnumsAsStrings();
                c.SwaggerDoc("v1", new Swashbuckle.AspNetCore.Swagger.Info() { Title = "Sp8de Game API", Version = "v1" });
                //c.OperationFilter<AuthorizationHeaderParameterOperationFilter>();
            });
        }

        private void ConfigureIdentity(IServiceCollection services)
        {
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(
                    options =>
                    {
                        var tokenValidationParameters = new TokenValidationParameters
                        {
                            ValidIssuer = Configuration["AuthToken:Issuer"],
                            ValidAudience = Configuration["AuthToken:Issuer"],
                            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Configuration["AuthToken:Key"]))
                        };

                        options.TokenValidationParameters = tokenValidationParameters;
                    });

            services.AddIdentityCore<IdentityUser>(options =>
            {
                options.Stores.MaxLengthForKeys = 128;

                //simplified for demo
                options.Password.RequiredLength = 6;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireDigit = false;
                options.SignIn.RequireConfirmedEmail = false;

                options.Lockout = new LockoutOptions
                {
                    AllowedForNewUsers = true,
                    DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5),
                    MaxFailedAccessAttempts = 100
                };

            }).AddEntityFrameworkStores<ApplicationDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();
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
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }

            app.UseCors(builder =>
                builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
            );

            app.UseCors("AllowAllOrigins");

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

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseCookiePolicy();

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sp8de API V1");
            });

            app.UseAuthentication();

            app.UseMiddleware<ErrorHandlingMiddleware>();

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
