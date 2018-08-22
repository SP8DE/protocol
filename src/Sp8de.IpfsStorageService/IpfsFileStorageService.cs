using Ipfs.Api;
using Ipfs.CoreApi;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Sp8de.Common.Interfaces;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.IpfsStorageService
{
    public class IpfsFileStorageService : IGenericDataStorage
    {
        private readonly IpfsStorageConfig config;
        private readonly ILogger<IGenericDataStorage> logger;
        private readonly ICoreApi ipfs;

        public IpfsFileStorageService(IpfsStorageConfig config, ILogger<IGenericDataStorage> logger)
        {
            this.config = config;
            this.logger = logger;
            this.ipfs = new IpfsClient(config.IpfsHost);
        }

        public async Task<IEntity> Add<TEntity>(string key, TEntity data) where TEntity : class, IEntity
        {
            using (var ms = new MemoryStream(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(data)), false))
            {
                var cid = await ipfs.FileSystem.AddAsync(ms, key);

                return new IpfsEntity()
                {
                    Id = cid.Id.Hash.ToString()
                };
            }
        }

        public async Task<TEntity> Get<TEntity>(string key) where TEntity : class, IEntity
        {
            var data = await ipfs.FileSystem.ReadAllTextAsync(key);
            var rs = JsonConvert.DeserializeObject<TEntity>(data);
            return rs;
        }
    }
}
