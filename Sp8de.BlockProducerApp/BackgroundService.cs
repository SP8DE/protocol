using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sp8de.Services.Explorer;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Sp8de.BlockProducerApp
{
    public class BackgroundService : IHostedService, IDisposable
    {
        private bool _stopping;
        private Task _backgroundTask;
        private readonly ISp8deBlockProducer producer;
        private readonly ILogger<BackgroundService> logger;
        private readonly AppConfig appConfig;

        public BackgroundService(ISp8deBlockProducer producer, ILogger<BackgroundService> logger, AppConfig appConfig)
        {
            this.producer = producer;
            this.logger = logger;
            this.appConfig = appConfig;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            logger.LogInformation($"{nameof(BackgroundService)} is starting.");
            _backgroundTask = BackgroundTask();
            return Task.CompletedTask;
        }

        private async Task BackgroundTask()
        {
            while (!_stopping)
            {
                await producer.Produce();
                await Task.Delay(TimeSpan.FromSeconds(appConfig.Delay ?? 15));

                logger.LogInformation($"{nameof(BackgroundService)}  is doing background work.");
            }

            logger.LogInformation($"{nameof(BackgroundService)}  background task is stopping.");
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            logger.LogInformation($"{nameof(BackgroundService)}  is stopping.");
            _stopping = true;
            if (_backgroundTask != null)
            {
                // TODO: cancellation
                await _backgroundTask;
            }
        }

        public void Dispose()
        {
            logger.LogInformation($"{nameof(BackgroundService)}  is disposing.");
        }
    }
}
