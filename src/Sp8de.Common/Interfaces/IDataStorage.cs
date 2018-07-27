using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Interfaces
{
    public interface IDataStorage
    {
        void Add(object data);
        object Get(object key);
    }
}
