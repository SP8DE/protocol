using Ipfs.Api;
using Sp8de.Common.Interfaces;
using Sp8de.Common.Models;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Sp8de.IpfsStorageService.Test
{
    public class IpfsStorageServiceTests
    {
        string ipfsHost = "http://localhost:5001";

        [Fact]
        public async Task WriteBlockTest()
        {
            var service = new IpfsStorageService(new IpfsStorageConfig { IpfsHost = ipfsHost }, null);

            var id = Guid.NewGuid().ToString("n");

            var rs1 = await service.WriteBlock(new RandomSessionData() { Version = 1, SessionId = id });

            var rs2 = await service.ReadBlock(rs1);
            Assert.Equal(rs2.SessionId, id);
        }
    }
}
