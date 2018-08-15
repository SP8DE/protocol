using System.Collections.Generic;

namespace Sp8de.Explorer.Api.Models
{
    public class PagedResult<T>
    {
        public IReadOnlyList<T> Items { get; set; }
        public long TotalCount { get; set; }
    }
}
