﻿using Marten;
using Marten.Linq;
using Sp8de.Common.BlockModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Services.Explorer
{
    public class Sp8deBlockStorage : ISp8deBlockStorage
    {
        private readonly IDocumentStore store;

        public Sp8deBlockStorage(Sp8deTransactionStorageConfig config)
        {
            if (config is null)
            {
                throw new ArgumentNullException(nameof(config));
            }

            this.store = DocumentStore.For(config.ConnectionString);
        }

        public async Task<Sp8deBlock> Get(long id)
        {
            using (var session = store.QuerySession())
            {
                var item = await session.LoadAsync<Sp8deBlock>(id);

                return item;
            }
        }

        public async Task<IReadOnlyList<Sp8deTransaction>> GetTransactions(long blockId)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deTransaction>()
                    .OrderBy(x => x.Timestamp)
                    .Where(x => x.Meta.BlockId == blockId)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return items;
            }
        }

        public async Task<Sp8deBlock> GetByHash(string hash)
        {
            using (var session = store.QuerySession())
            {
                return await session.Query<Sp8deBlock>()
                    .Where(x => x.Hash == hash)
                    .FirstOrDefaultAsync().ConfigureAwait(false);
            }
        }

        public Task<long> Add(Sp8deBlock data)
        {
            using (var session = store.LightweightSession())
            {
                session.Store(data);
                session.SaveChanges();

                return Task.FromResult(data.Id);
            }
        }

        public async Task<IReadOnlyList<Sp8deBlock>> Search(string q, int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deBlock>()
                    .Where(x => x.Hash.Contains(q))
                    .OrderBy(x => x.Timestamp)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return items;
            }
        }

        public async Task<(IReadOnlyList<Sp8deBlock> items, long totalResults)> List(int offset = 0, int limit = 25)
        {
            using (var session = store.QuerySession())
            {
                var items = await session.Query<Sp8deBlock>()
                    .Stats(out QueryStatistics stats)
                    .OrderBy(x => x.Id)
                    .Skip(offset)
                    .Take(limit)
                    .ToListAsync()
                    .ConfigureAwait(false);

                return (items, stats.TotalResults);
            }
        }

        public async Task<Sp8deBlock> GetLatestBlock()
        {
            using (var session = store.QuerySession())
            {
                var item = await session.Query<Sp8deBlock>()
                    .Stats(out QueryStatistics stats)
                    .OrderByDescending(x => x.Id)
                    .FirstOrDefaultAsync()
                    .ConfigureAwait(false);

                return item;
            }
        }
    }
}
