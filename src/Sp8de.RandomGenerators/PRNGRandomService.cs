using Sp8de.Common.BlockModels;
using Sp8de.Common.Enums;
using Sp8de.Common.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using Troschuetz.Random.Generators;

namespace Sp8de.RandomGenerators
{
    public class PRNGRandomService : IPRNGRandomService
    {
        public int[] Generate(IList<uint> seed, int count, int min, int max, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937)
        {
            var arr = new int[count];
            var rng = GetGenerator(type, seed);
            for (int i = 0; i < count; i++)
            {
                arr[i] = rng.Next(min, max + 1);
            }
            return arr;
        }

        private AbstractGenerator GetGenerator(PRNGAlgorithmType type, IList<uint> seed)
        {
            switch (type)
            {
                case PRNGAlgorithmType.MT19937:
                    return new MT19937Generator(seed.ToArray());
                case PRNGAlgorithmType.XorShift128:
                    return new XorShift128Generator(AggregateSeed(seed));
                default:
                    throw new ArgumentException($"{nameof(PRNGAlgorithmType)}");
            }
        }

        /// <summary>
        /// Fisher–Yates shuffle
        /// </summary>
        public void Shuffle(IList<uint> seed, int[] array, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937)
        {
            var rng = GetGenerator(type, seed);

            int n = array.Length;
            while (n > 1)
            {
                int k = rng.Next(n--);
                int temp = array[n];
                array[n] = array[k];
                array[k] = temp;
            }
        }

        public uint AggregateSeed(IList<uint> seedArray)
        {
            return seedArray.Aggregate((x, y) => x ^ y);
        }

        public int[] GenerateUnique(IList<uint> seed, int count, int min, int max, PRNGAlgorithmType type = PRNGAlgorithmType.MT19937)
        {
            var rng = GetGenerator(type, seed);

            var set = new HashSet<int>();

            int data;
            for (int i = 0; i < int.MaxValue; i++)
            {
                data = rng.Next(min, max);

                if (!set.Contains(data))
                {
                    set.Add(data);
                }

                if (set.Count >= count)
                {
                    break;
                }
            }

            return set.ToArray();
        }
    }
}
