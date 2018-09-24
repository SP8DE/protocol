using System.Collections.Generic;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Enums;

namespace Sp8de.Common.Interfaces
{
    public interface IPRNGRandomService
    {
        IList<int> GetVerifiableRandomNumbers(IList<uint> sharedSeed, RandomSettings settings);
        int[] Generate(IList<uint> seed, int count, int min, int max, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937);
        int[] GenerateUnique(IList<uint> seed, int count, int min, int max, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937);
        void Shuffle(IList<uint> seed, int[] array, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937);
    }
}