using Marten;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.MartenStorage
{
    public class MartenStorage : IStorageService
    {
        private readonly DocumentStore store;

        public MartenStorage(string connectionString)
        {
            this.store = DocumentStore.For(connectionString);
        }

        public async Task<RandomSessionData> ReadBlock(string hash)
        {
            using (var session = store.QuerySession())
            {
                var item = await session.LoadAsync<RandomSessionData>(hash);

                return item;
            }
        }

        public Task<string> WriteBlock(RandomSessionData data)
        {
            using (var session = store.LightweightSession())
            {
                data.Id = data.Id ?? Guid.NewGuid().ToString("n");

                session.Store(data);
                session.SaveChanges();

                return Task.FromResult(data.Id);
            }
        }
    }
}
