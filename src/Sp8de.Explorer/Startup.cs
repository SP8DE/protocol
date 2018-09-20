using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using Sp8de.EthServices;
using Sp8de.RandomGenerators;
using Sp8de.Services.Explorer;
using Sp8de.Services.Protocol;
using System.Linq;

namespace Sp8de.Explorer
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
            services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1).AddJsonOptions(options =>
            {
                options.SerializerSettings.Converters.Add(new Newtonsoft.Json.Converters.StringEnumConverter());
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

            services.Configure<Sp8deStorageConfig>(Configuration.GetSection(nameof(Sp8deStorageConfig)));
            services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<Sp8deStorageConfig>>().Value);

            services.AddTransient<ISp8deSearchService, Sp8deSearchService>();
            services.AddTransient<ISp8deTransactionStorage, Sp8deTransactionStorage>();
            services.AddTransient<ISp8deBlockStorage, Sp8deBlockStorage>();
            services.AddTransient<ICryptoService, EthCryptoService>();
            services.AddTransient<IPRNGRandomService, PRNGRandomService>();

            services.AddSwaggerGen(c =>
            {
                c.DescribeAllParametersInCamelCase();
                //c.DescribeStringEnumsInCamelCase();
                c.DescribeAllEnumsAsStrings();
                c.SwaggerDoc("v1", new Swashbuckle.AspNetCore.Swagger.Info() { Title = "Sp8de Explorer API", Version = "v1" });
            });

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

            app.UseDeveloperExceptionPage();
            app.UseDatabaseErrorPage();

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

            app.UseStaticFiles();

            app.UseHttpsRedirection();

            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Sp8de Explorer API V1");
            });

            app.UseMvc();
        }
    }
}
