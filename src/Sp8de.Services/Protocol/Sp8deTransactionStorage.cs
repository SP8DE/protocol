using Marten;
using Marten.Linq;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Services.Protocol
{
    public class Sp8deTransactionStorage : ISp8deTransactionStorage
    {
        private readonly IDocumentStore store;

        public Sp8deTransactionStorage(Sp8deStorageConfig config)
        {
            if (config is null)
            {
                throw new ArgumentNullException(nameof(config));
            }

            this.store = DocumentStore.For(s =>
            {
                s.Connection(config.ConnectionString);

                s.Schema.For<Sp8deTransaction>().Identity(x => x.Id);

                s.Schema.For<Sp8deTransaction>().Duplicate(x => x.Type);
                s.Schema.For<Sp8deTransaction>().Duplicate(x => x.Status);
                s.Schema.For<Sp8deTransaction>().Duplicate(x => x.DependsOn);
            });
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
                session.Insert(data);
                session.SaveChanges();

                return Task.FromResult(data.Id);
            }
        }

        public async Task<IReadOnlyList<Sp8deTransaction>> Search(string q, int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deTransaction>()
                    .Where(x => x.Id == q || x.Id.Contains(q) || x.DependsOn == q || (x.DependsOn != null && x.DependsOn.Contains(q)))
                    .OrderBy(x => x.Timestamp)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return items;
            }
        }

        public async Task<(IReadOnlyList<Sp8deTransaction> items, long totalResults)> List(int offset = 0, int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deTransaction>()
                    .Stats(out QueryStatistics stats)
                    .OrderBy(x => x.Timestamp)
                    .Skip(offset)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return (items, stats.TotalResults);
            }
        }

        public async Task<IReadOnlyList<Sp8deTransaction>> GetPending(int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deTransaction>()
                    .Where(x => x.Status == Sp8deTransactionStatus.New)
                    .OrderBy(x => x.Timestamp)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return items;
            }
        }

        public async Task<IReadOnlyList<Sp8deTransaction>> GetLatest(int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deTransaction>()
                    .OrderByDescending(x => x.Timestamp)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return items;
            }
        }

        public async Task Update(IReadOnlyList<Sp8deTransaction> items)
        {
            using (var session = store.LightweightSession())
            {
                session.Update(items.ToArray());
                await session.SaveChangesAsync();
            }
        }
    }
}
