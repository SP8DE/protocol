﻿using Sp8de.Common.Interfaces;
using Sp8de.DataModel;
using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Services
{
    public class EfDataStorage : IDataStorage
    {
        private readonly Sp8deDbContext context;

        public EfDataStorage(Sp8deDbContext context)
        {
            this.context = context;
        }

        public void Add(object data)
        {
            throw new NotImplementedException();
        }

        public object Get(object key)
        {
            throw new NotImplementedException();
        }

        public void Save()
        {

        }
    }
}
