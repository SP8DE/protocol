using Ipfs.Api;
using Ipfs.CoreApi;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace Sp8de.IpfsStorageService
{

    public class IpfsStorageService : IStorageService
    {
        private readonly IpfsStorageConfig config;
        private readonly ILogger<IStorageService> logger;
        private readonly ICoreApi ipfs;

        public IpfsStorageService(IpfsStorageConfig config, ILogger<IStorageService> logger)
        {
            this.config = config;
            this.logger = logger;
            this.ipfs = new IpfsClient(config.IpfsHost);
        }

        public async Task<string> WriteText(string text)
        {
            var res = await ipfs.FileSystem.AddTextAsync(text);
            return res.Id.Hash.ToString();
        }

        public async Task<string> WriteBlock(RandomSessionData data)
        {
            using (var ms = new MemoryStream(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(data)), false))
            {
                var cid = await ipfs.Block.PutAsync(ms);
                return cid.Hash.ToString();
            }
        }

        public async Task<RandomSessionData> ReadBlock(string hash)
        {
            var data = await ipfs.Block.GetAsync(hash);
            var rs = JsonConvert.DeserializeObject<RandomSessionData>(Encoding.UTF8.GetString(data.DataBytes));
            return rs;
        }
    }
}
