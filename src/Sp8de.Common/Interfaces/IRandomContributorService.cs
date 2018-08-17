using Sp8de.Common.RandomModels;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IRandomContributorService
    {
        Task<CommitItem> GenerateCommit(string salt);
        Task<RevealItem> Reveal(CommitItem item);
    }
}