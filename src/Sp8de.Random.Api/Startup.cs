﻿using System.Collections.Concurrent;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.DataModel;
using Sp8de.EthServices;
using Sp8de.IpfsStorageService;
//using Sp8de.IpfsStorageService;
using Sp8de.Random.Api.Authentication;
using Sp8de.Random.Api.Models;
using Sp8de.Random.Api.Services;
using Sp8de.RandomGenerators;
//using Sp8de.RandomGenerators;
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
            services.AddEntityFrameworkNpgsql()
                    .AddDbContext<Sp8deDbContext>(x => x.UseNpgsql(
                        Configuration.GetConnectionString("DefaultConnection")
                        ));

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

            services.Configure<Sp8deStorageConfig>(Configuration.GetSection(nameof(Sp8deStorageConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<Sp8deStorageConfig>>().Value);

            services.AddScoped<ISp8deTransactionStorage, Sp8deTransactionStorage>();
            services.AddTransient<ISp8deTransactionNodeService, Sp8deTransactionNodeService>();

            AddIpfs(services);

            services.AddTransient<ICryptoService, EthCryptoService>();
            services.AddScoped<IKeySecretManager, EthKeySecretManager>();
            services.AddTransient<IRandomNumberGenerator, RNGRandomGenerator>();

            services.Configure<RandomContributorConfig>(Configuration.GetSection(nameof(RandomContributorConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<RandomContributorConfig>>().Value);
            services.AddTransient<IRandomContributorService, BuildinRandomContributorService>();
            services.AddSingleton<IGenericDataStorage, InMemoryDataStorage>(); //DEV

            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1).AddJsonOptions(options =>
            {
                options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
            });

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

        private void AddIpfs(IServiceCollection services)
        {
            services.AddTransient<IExternalAnchorService, IpfsExternalAnchorService>();
            services.AddTransient<IpfsFileStorageService>();
            services.Configure<IpfsStorageConfig>(Configuration.GetSection(nameof(IpfsStorageConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<IpfsStorageConfig>>().Value);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            app.UseDeveloperExceptionPage();

            if (env.IsDevelopment())
            {
                
            }
            else
            {
                app.UseHsts();
            }

            app.UseCors(builder =>
                builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
            );

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

    public class InMemoryDataStorage : IGenericDataStorage
    {
        private readonly ConcurrentDictionary<string, string> storage;

        public InMemoryDataStorage()
        {
            this.storage = new ConcurrentDictionary<string, string>();
        }

        public Task<IEntity> Add<TEntity>(string key, TEntity data) where TEntity : class, IEntity
        {
            var json = JsonConvert.SerializeObject(data);
            this.storage[key] = json;
            return Task.FromResult((IEntity)data);
        }

        public Task<TEntity> Get<TEntity>(string key) where TEntity : class, IEntity
        {
            return storage.TryGetValue(key, out var value) ? Task.FromResult(JsonConvert.DeserializeObject<TEntity>(value)) : Task.FromResult(default(TEntity));
        }
    }
}
