using Sp8de.Common.RandomModels;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IRandomContributorService
    {
        Task<CommitItem> Commit(string salt = null);
        Task<RevealItem> Reveal(SignedItem item);
    }
}