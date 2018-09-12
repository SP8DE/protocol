using System;
using System.Collections.Generic;
using System.Text;
using Xunit;

namespace Sp8de.Services.Tests
{
    public class CRNGTest
    {
        [Fact]
        public void Test() {
            var rnd = new CRNGRandom();
            var data = rnd.NextLong();
        }

    }
}
