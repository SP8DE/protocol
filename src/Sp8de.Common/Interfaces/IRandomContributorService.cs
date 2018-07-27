using Sp8de.Common.RandomModels;

namespace Sp8de.Common.Interfaces
{
    public interface IRandomContributorService
    {
        CommitItem GenerateCommit(string salt);
        RevealItem Reveal(CommitItem item);
    }
}