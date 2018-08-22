using Newtonsoft.Json;
using Sp8de.Common.Interfaces;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace Sp8de.Storage
{
    public class InMemoryDataStorage : IGenericDataStorage
    {
        private readonly ConcurrentDictionary<string, string> storage;

        public InMemoryDataStorage()
        {
            this.storage = new ConcurrentDictionary<string, string>();
        }

        public Task<IEntity> Add<TEntity>(string key, TEntity data) where TEntity : class, IEntity
        {
            var json = JsonConvert.SerializeObject(data);
            this.storage[key] = json;
            return Task.FromResult((IEntity)data);
        }

        public Task<TEntity> Get<TEntity>(string key) where TEntity : class, IEntity
        {
            return storage.TryGetValue(key, out var value) ? Task.FromResult(JsonConvert.DeserializeObject<TEntity>(value)) : Task.FromResult(default(TEntity));
        }
    }
}
