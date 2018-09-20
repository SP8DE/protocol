using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Utils;
using Sp8de.IpfsStorageService;
using System.Threading.Tasks;

namespace Sp8de.IpfsStorageService
{
    public class IpfsExternalAnchorService : IExternalAnchorService
    {
        private readonly IpfsFileStorageService ipfs;

        public IpfsExternalAnchorService(IpfsFileStorageService ipfs)
        {
            this.ipfs = ipfs;
        }

        public string Type => "ipfs";

        public async Task<Anchor> Add(Sp8deTransaction transaction)
        {
            if (ipfs.IsActive)
            {
                var rs = await ipfs.Add(transaction.Id, transaction);

                return new Anchor()
                {
                    Type = Type,
                    Data = rs.Id,
                    Timestamp = DateConverter.UtcNow
                };
            }

            return null;
        }
    }
}
