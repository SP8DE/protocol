using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Services.Mock
{
    public class MockRandomContributorService : IRandomContributorService
    {
        public CommitItem GenerateCommit(string salt)
        {
            throw new NotImplementedException();
        }

        public RevealItem Reveal(CommitItem item)
        {
            throw new NotImplementedException();
        }
    }
}
