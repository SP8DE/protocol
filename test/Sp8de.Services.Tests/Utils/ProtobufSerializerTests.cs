//using ProtoBuf;
//using Sp8de.Common.RandomModels;
//using Sp8de.Services.Utils;
//using System;
//using System.Collections.Generic;
//using System.IO;
//using System.Linq;
//using System.Text;
//using Xunit;

//namespace Sp8de.Services.Tests.Utils
//{

//    [ProtoContract]
//    public class TestItem
//    {
//        [ProtoMember(1)]
//        public long Seed { get; set; }
//        [ProtoMember(2)]
//        public string Hash { get; set; }
//    }

//    [ProtoContract]
//    public class TestContainer
//    {
//        [ProtoMember(1)]
//        public string Id { get; set; }
//        [ProtoMember(2)]
//        public List<TestItem> Items { get; set; }
//    }



//    public class ProtobufSerializerTests
//    {
//        [Fact]
//        public void Test()
//        {
//            var container = new TestContainer()
//            {
//                Id = "1",
//                Items = Enumerable.Range(1, 3).Select(x => new TestItem()
//                {
//                    Seed = x,
//                    Hash = $"X{x}"
//                }).ToList()
//            };

//            using (var ms = new MemoryStream())
//            {
//                Serializer.Serialize(ms, container);
//                var ar = ms.ToArray();
//            }


//            var data = new ProtobufSerializer().Serialize(container);

//        }
//    }
//}
