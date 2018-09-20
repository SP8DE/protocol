using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NLog;
using NLog.Extensions.Hosting;
using Sp8de.Common.Interfaces;
using Sp8de.EthServices;
using Sp8de.Services.Explorer;
using Sp8de.Services.Protocol;
using System;
using System.Threading.Tasks;

namespace Sp8de.BlockProducerApp
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var logger = LogManager.GetCurrentClassLogger();
            try
            {
                var builder = new HostBuilder()
                    .UseNLog()
                    .ConfigureAppConfiguration((hostContext, config) =>
                    {
                        config.AddJsonFile("appsettings.json", optional: true);
                        config.AddJsonFile("appsettings.Production.json", optional: true);

                        if (args != null)
                        {
                            config.AddCommandLine(args);
                        }
                    })
                    .ConfigureServices((hostContext, services) =>
                    {
                        services.Configure<AppConfig>(hostContext.Configuration.GetSection(nameof(AppConfig)));
                        services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<AppConfig>>().Value);

                        services.Configure<Sp8deStorageConfig>(hostContext.Configuration.GetSection(nameof(Sp8deStorageConfig)));
                        services.AddScoped(cfg => cfg.GetService<IOptionsSnapshot<Sp8deStorageConfig>>().Value);

                        services.AddTransient<ICryptoService, EthCryptoService>();
                        services.AddTransient<ISp8deBlockProducer, Sp8deBlockProducer>();
                        services.AddTransient<ISp8deSearchService, Sp8deSearchService>();
                        services.AddTransient<ISp8deTransactionStorage, Sp8deTransactionStorage>();
                        services.AddTransient<ISp8deBlockStorage, Sp8deBlockStorage>();

                        services.AddHostedService<BackgroundJobService>();
                    })
                    .ConfigureLogging((hostingContext, configLogging) =>
                    {
                        configLogging.AddConsole();
                    });

                await builder.RunConsoleAsync();

                Console.WriteLine("The host container has terminated. Press ANY key to exit the console.");
                Console.ReadKey();
            }
            catch (Exception ex)
            {
                // NLog: catch setup errors (exceptions thrown inside of any containers may not necessarily be caught)
                logger.Fatal(ex, "Stopped program because of exception");
                throw;
            }
            finally
            {
                // Ensure to flush and stop internal timers/threads before application-exit (Avoid segmentation fault on Linux)
                LogManager.Shutdown();
            }
        }
    }
}
