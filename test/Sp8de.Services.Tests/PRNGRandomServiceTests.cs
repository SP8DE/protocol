using Sp8de.RandomGenerators;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Xunit;

namespace Sp8de.Services.Tests
{
    public class PRNGRandomServiceTests
    {
        [Theory]
        [InlineData(10)]
        public void MT19937Test(int max)
        {
            var service = new PRNGRandomService();
            var array = service.Generate(new[] { 1, 2, 3 }, max * 10, 1, max, Common.Enums.PRNGAlgorithmType.MT19937);
            var data = array.Distinct();

            Assert.Equal(max, data.Count());
        }

        [Theory]
        [InlineData(10)]
        public void XorShift128Test(int max)
        {
            var service = new PRNGRandomService();
            var array = service.Generate(new[] { 1, 2, 3 }, max * 10, 1, max, Common.Enums.PRNGAlgorithmType.XorShift128);
            var data = array.Distinct();

            Assert.Equal(max, data.Count());
        }
    }
}
