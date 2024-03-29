﻿using System.Threading.Tasks;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;

namespace Sp8de.Common.Interfaces
{
    public interface ISp8deBlockProducer
    {
        Task<Sp8deBlock> Produce(IKeySecret producerKey);
    }
}