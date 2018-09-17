﻿using System.Collections.Generic;
using System.Threading.Tasks;
using Sp8de.Common.BlockModels;

namespace Sp8de.Services.Explorer
{
    public interface ISp8deSearchService
    {
        Task<List<SearchItem>> Search(string q, int limit = 25);
    }
}