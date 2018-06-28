using Ipfs.Api;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Sp8de.IpfsStorageService.Test
{
    /// <summary>
    /// required to install daemon
    /// ipfs daemon --enable-pubsub-experiment
    /// </summary>
    public class IpfsPubSubTests
    {
        string ipfsHost = "http://localhost:5001";

        [Fact]
        public async Task SubscribeTest()
        {
            var client = new IpfsClient(ipfsHost);

            var topic = "spx-game-" + Guid.NewGuid().ToString("n");

            var cs = new CancellationTokenSource();
            try
            {
                await client.PubSub.Subscribe(topic, msg =>
                {
                    Console.Write(msg.ToString());
                }, cs.Token);

                await client.PubSub.Publish(topic, $"game-start {DateTime.UtcNow.Ticks}");

                await Task.Delay(2000);
            }
            finally
            {
                cs.Cancel();
            }
        }
    }
}
