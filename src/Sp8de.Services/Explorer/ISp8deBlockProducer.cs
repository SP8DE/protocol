using System.Threading.Tasks;
using Sp8de.Common.BlockModels;

namespace Sp8de.Services.Explorer
{
    public interface ISp8deBlockProducer
    {
        Task<Sp8deBlock> Produce(int limit = 1);
    }
}