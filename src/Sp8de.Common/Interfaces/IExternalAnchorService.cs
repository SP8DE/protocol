using Sp8de.Common.BlockModels;
using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IExternalAnchorService
    {
        string Type { get; }
        Task<Anchor> Add(Sp8deTransaction transaction);
    }
}
