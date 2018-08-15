using Marten;
using Sp8de.Common.BlockModels;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Explorer.Api.Models
{

    public enum SearchItemType
    {
        Transaction = 0,
        Block = 1
    }
}
