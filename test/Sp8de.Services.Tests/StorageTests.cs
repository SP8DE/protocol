using Sp8de.Common.BlockModels;
using Sp8de.Storage;
using System.Collections.Generic;
using Xunit;

namespace Sp8de.Services.Tests
{
    public class StorageTests
    {
        private InMemoryDataStorage storage;

        public StorageTests()
        {
            storage = new InMemoryDataStorage();
        }

        [Fact]
        public async void Test()
        {
            var tx = new Sp8deTransaction()
            {
                Id = "0x1",
                InternalTransactions = new List<InternalTransaction>() {
                    new InternalTransaction(){
                        Hash ="0x2"
                    }
                }
            };

            await storage.Add(tx.Id, tx);

            var data = await storage.Get<Sp8deTransaction>(tx.Id);

            Assert.Equal(tx.Id, data.Id);
        }
    }
}
