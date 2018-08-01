using Sp8de.RandomGenerators;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Troschuetz.Random.Generators;
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
            var array = service.Generate(new uint[] { 1, 2, 3 }, 10, 1, max, Common.Enums.PRNGAlgorithmType.MT19937);
            var data = array.Distinct();

            Assert.Equal(max, data.Count());
        }

        [Fact]
        public void MT19937ManualTest()
        {
            var service = new PRNGRandomService();
            var seedArray = service.Generate(new uint[] { 253858671, 858736590, 1052288703, 2110868011, 468866989, 799787176, 65869483, 1821377874, 1567047110, 1677552375, 1942724549, 1927805448 }, 10, 1, 10, Common.Enums.PRNGAlgorithmType.MT19937);
            var array = service.Generate(new uint[] { 100 }, 10, 1, 10, Common.Enums.PRNGAlgorithmType.MT19937);
            var data = array.Distinct();

            Assert.Equal(2, data.Single());
        }



        [Theory]
        [InlineData(10)]
        public void XorShift128Test(int max)
        {
            var service = new PRNGRandomService();
            var array = service.Generate(new uint[] { 1, 2, 3 }, max * 10, 1, max, Common.Enums.PRNGAlgorithmType.XorShift128);
            var data = array.Distinct();

            Assert.Equal(max, data.Count());
        }


        [Fact]
        void Mt() {
            var rnd = new MT19937Generator(new uint[] { 1, 2, 3 });
            var list = new List<int>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.Next(1,7));
            }
            Assert.Equal(10, list.Count());
        }

        [Fact]
        void Mt1()
        {
            var rnd = new MT19937Generator(new uint[] { 1, 2, 3 });
            var list = new List<uint>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.NextUInt());
            }
            Assert.Equal(10, list.Count());
        }

        //GOOD
        [Fact]
        void Mt21()
        {
            var rnd = new MT19937Generator(new [] { 1, 2, 3 });
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.Next());
            }

            
            Assert.Equal(10, list.Count());
        }

        [Fact]
        void Mt21_2()
        {
            var rnd = new MT19937Generator(new[] { 1, 2, 3 });
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.NextUInt());
            }
            Assert.Equal(10, list.Count());
        }

        [Fact]
        void Mt21_3()
        {
            var rnd = new MT19937Generator(new uint[] { 3812420242, 459506247, 2183839257, 580200489, 2015677638, 927419777, 441890165, 2639697008, 2119246415, 1824953119, 2556517629, 704541974 });
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.NextUInt());
            }
            Assert.Equal(10, list.Count());
        }

        [Fact]
        void Mt21_4()
        {
            var rnd = new MT19937Generator(new uint[] { 3812420242, 459506247, 2183839257, 580200489, 2015677638, 927419777, 441890165, 2639697008, 2119246415, 1824953119, 2556517629, 704541974 });
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                //list.Add(rnd.NextUIntInclusiveMaxValue()* (1.0 / 4294967296.0));
                //list.Add(scaleInt(rnd.NextUIntInclusiveMaxValue()));
                list.Add(rnd.NextUInt(1,7));
                //list.Add(rnd.Next(1, 7));
            }

            Assert.Equal(10, list.Count());
        }

        public uint scaleInt(uint uintRnd, int min = 1, int max = 6)
        {
            double rnd = uintRnd * (1.0 / 4294967296.0);
            return Convert.ToUInt32(Math.Floor(rnd * (max - min + 1.0)) + min);
        }

        public uint scaleInt2(double rnd, int min = 1, int max = 6)
        {
            return Convert.ToUInt32(Math.Floor(rnd * (max - min + 1.0)) + min);
        }

        public double getRandomIntInclusive(double rnd, double min = 1, double max = 6) {

            return Math.Floor(rnd * (max - min + 1.0)) + min;
        }



        [Fact]
        void Mt21_5()
        {
            var rnd = new MT19937Generator(new uint[] { 3812420242, 459506247, 2183839257, 580200489, 2015677638, 927419777, 441890165, 2639697008, 2119246415, 1824953119, 2556517629, 704541974 });
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(scaleInt2(rnd.NextDouble()));
            }
            Assert.Equal(10, list.Count());
        }


        [Fact]
        void Mt22()
        {
            var rnd = new MT19937Generator(34);
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.NextUInt(0,1));
            }
            Assert.Equal(10, list.Count());
        }

        [Fact]
        void Mt23()
        {
            var rnd = new MT19937Generator(34);
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.NextUIntExclusiveMaxValue());
            }
            Assert.Equal(10, list.Count());
        }

        [Fact]
        void Mt24()
        {
            var rnd = new MT19937Generator(34);
            var list = new List<double>();
            for (int i = 0; i < 10; i++)
            {
                list.Add(rnd.NextUIntInclusiveMaxValue());
            }
            Assert.Equal(10, list.Count());
        }
    }
}
