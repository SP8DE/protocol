using Marten;
using Marten.Linq;
using Sp8de.Common.BlockModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.Services.Explorer
{
    public class Sp8deTransactionStorageConfig
    {
        public string ConnectionString { get; set; }
    }

    public class Sp8deTransactionStorage : ISp8deTransactionStorage
    {
        private readonly IDocumentStore store;

        public Sp8deTransactionStorage(Sp8deTransactionStorageConfig config)
        {
            if (config is null)
            {
                throw new ArgumentNullException(nameof(config));
            }

            this.store = DocumentStore.For(config.ConnectionString);
        }

        public async Task<Sp8deTransaction> Get(string hash)
        {
            using (var session = store.QuerySession())
            {
                var item = await session.LoadAsync<Sp8deTransaction>(hash);

                return item;
            }
        }

        public Task<string> Add(Sp8deTransaction data)
        {
            using (var session = store.LightweightSession())
            {
                session.Store(data);
                session.SaveChanges();

                return Task.FromResult(data.Id);
            }
        }

        public async Task<(IReadOnlyList<Sp8deTransaction>, long totalResults)> List(int offset = 0, int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deTransaction>()
                    .Stats(out QueryStatistics stats)
                    .OrderByDescending(x => x.Timestamp)
                    .Skip(offset)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return (items, stats.TotalResults);
            }
        }
    }
}
