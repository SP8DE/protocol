using Sp8de.Common.Models;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IStorageService
    {
        Task<string> WriteBlock(RandomSessionData data);
        Task<RandomSessionData> ReadBlock(string hash);
    }
}
