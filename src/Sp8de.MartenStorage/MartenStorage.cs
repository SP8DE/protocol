﻿using Marten;
using Sp8de.Common.Interfaces;
using System.Threading.Tasks;

namespace Sp8de.MartenStorage
{
    public class MartenStorageService : IGenericDataStorage
    {
        private readonly DocumentStore store;

        public MartenStorageService(string connectionString)
        {
            this.store = DocumentStore.For(connectionString);
        }

        public Task<IEntity> Add<TEntity>(string key, TEntity data) where TEntity : class, IEntity
        {
            using (var session = store.LightweightSession())
            {
                session.Store(data);
                session.SaveChanges();

                return Task.FromResult((IEntity)data);
            }
        }

        public Task<TEntity> Get<TEntity>(string key) where TEntity : class, IEntity
        {
            using (var session = store.QuerySession())
            {
                return session.LoadAsync<TEntity>(key);
            }
        }
    }
}
