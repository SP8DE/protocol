using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sp8de.Common.Interfaces;
using Sp8de.EthServices;
using Sp8de.Services.Explorer;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Sp8de.BlockProducerApp
{
    public class BackgroundJobService : IHostedService, IDisposable
    {
        private bool _stopping;
        private Task _backgroundTask;
        private readonly ISp8deBlockProducer producer;
        private readonly ILogger<BackgroundJobService> logger;
        private readonly AppConfig appConfig;

        public BackgroundJobService(ISp8deBlockProducer producer, ILogger<BackgroundJobService> logger, AppConfig appConfig)
        {
            this.producer = producer;
            this.logger = logger;
            this.appConfig = appConfig;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            logger.LogInformation($"{nameof(BackgroundJobService)} is starting.");
            _backgroundTask = BackgroundTask();
            return Task.CompletedTask;
        }

        private async Task BackgroundTask()
        {
            if (appConfig.PrivateKeys == null)
            {
                throw new ArgumentNullException(nameof(appConfig.PrivateKeys));
            }

            while (!_stopping)
            {
                logger.LogInformation($"{nameof(BackgroundJobService)} is doing background work.");
                var block = await producer.Produce(GetKey());
                logger.LogInformation($"{nameof(BackgroundJobService)} block {block?.Id} {(block == null ? "skiped" : "produced")}");

                await Task.Delay(TimeSpan.FromSeconds(appConfig.Delay ?? 15));
            }

            logger.LogInformation($"{nameof(BackgroundJobService)} background task is stopping.");
        }

        private IKeySecret GetKey()
        {
            return EthKeySecret.Load(appConfig.PrivateKeys[new Random().Next(0, appConfig.PrivateKeys.Length)]);
        }

        public async Task StopAsync(CancellationToken cancellationToken)
        {
            logger.LogInformation($"{nameof(BackgroundJobService)} is stopping.");
            _stopping = true;
            if (_backgroundTask != null)
            {
                // TODO: cancellation
                await _backgroundTask;
            }
        }

        public void Dispose()
        {
            logger.LogInformation($"{nameof(BackgroundJobService)} is disposing.");
        }
    }
}
