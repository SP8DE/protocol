using System.Collections.Generic;
using Sp8de.Common.Enums;

namespace Sp8de.Common.Interfaces
{
    public interface IPRNGRandomService
    {
        int[] Generate(IList<int> seed, int count, int min, int max, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937);
        int[] GenerateUnique(IList<int> seed, int count, int min, int max, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937);
        void Shuffle(IList<int> seed, int[] array, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937);
    }
}