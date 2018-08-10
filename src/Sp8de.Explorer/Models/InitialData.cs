using Marten;
using Sp8de.Common.BlockModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Models
{
    public class InitialData
    {
        public IEnumerable<Sp8deTransaction> GenerateTransactions()
        {
            for (int i = 0; i < 100; i++)
            {
                yield return new Sp8deTransaction() {
                    Id = $"0x{i}",
                    Hash = $"0x{i}",
                    
                };
            }
        }

        public void Populate(IDocumentStore store)
        {
            using (var session = store.LightweightSession())
            {
                //session.Store();
                session.SaveChanges();
            }
        }
    }
}
