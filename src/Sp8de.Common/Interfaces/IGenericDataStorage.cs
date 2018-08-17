using System.Threading.Tasks;

namespace Sp8de.Common.Interfaces
{
    public interface IGenericDataStorage
    {
        Task Add<TEntity>(string key, TEntity data) where TEntity : class, IEntity;
        Task<TEntity> Get<TEntity>(string key) where TEntity : class, IEntity;
    }
}
