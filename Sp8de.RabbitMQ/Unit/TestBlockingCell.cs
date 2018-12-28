// This source code is dual-licensed under the Apache License, version
// 2.0, and the Mozilla Public License, version 1.1.
//
// The APL v2.0:
//
//---------------------------------------------------------------------------
//   Copyright (c) 2007-2016 Pivotal Software, Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//---------------------------------------------------------------------------
//
// The MPL v1.1:
//
//---------------------------------------------------------------------------
//  The contents of this file are subject to the Mozilla Public License
//  Version 1.1 (the "License"); you may not use this file except in
//  compliance with the License. You may obtain a copy of the License
//  at http://www.mozilla.org/MPL/
//
//  Software distributed under the License is distributed on an "AS IS"
//  basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
//  the License for the specific language governing rights and
//  limitations under the License.
//
//  The Original Code is RabbitMQ.
//
//  The Initial Developer of the Original Code is Pivotal Software, Inc.
//  Copyright (c) 2007-2016 Pivotal Software, Inc.  All rights reserved.
//---------------------------------------------------------------------------

using NUnit.Framework;

using System;
using System.Threading;

using RabbitMQ.Util;

namespace RabbitMQ.Client.Unit
{
    [TestFixture]
    public class TestBlockingCell : TimingFixture
    {
        public class DelayedSetter<T>
        {
            public BlockingCell<T> m_k;
            public int m_delayMs;
            public T m_v;
            public void Run()
            {
                Thread.Sleep(m_delayMs);
                m_k.ContinueWithValue(m_v);
            }
        }

        public static void SetAfter<T>(int delayMs, BlockingCell<T> k, T v)
        {
            var ds = new DelayedSetter<T>();
            ds.m_k = k;
            ds.m_delayMs = delayMs;
            ds.m_v = v;
            new Thread(new ThreadStart(ds.Run)).Start();
        }

        public DateTime m_startTime;

        public void ResetTimer()
        {
            m_startTime = DateTime.Now;
        }

        public int ElapsedMs()
        {
            return (int)((DateTime.Now - m_startTime).TotalMilliseconds);
        }

        [Test]
        public void TestSetBeforeGet()
        {
            var k = new BlockingCell<int>();
            k.ContinueWithValue(123);
            Assert.AreEqual(123, k.WaitForValue());
        }

        [Test]
        public void TestGetValueWhichDoesNotTimeOut()
        {
            var k = new BlockingCell<int>();
            k.ContinueWithValue(123);

            ResetTimer();
            var v = k.WaitForValue(TimingInterval);
            Assert.Greater(SafetyMargin, ElapsedMs());
            Assert.AreEqual(123, v);
        }

        [Test]
        public void TestGetValueWhichDoesTimeOut()
        {
            var k = new BlockingCell<int>();
            ResetTimer();
            Assert.Throws<TimeoutException>(() => k.WaitForValue(TimingInterval));
        }

        [Test]
        public void TestGetValueWhichDoesTimeOutWithTimeSpan()
        {
            var k = new BlockingCell<int>();
            ResetTimer();
            Assert.Throws<TimeoutException>(() => k.WaitForValue(TimeSpan.FromMilliseconds(TimingInterval)));
        }

        [Test]
        public void TestGetValueWithTimeoutInfinite()
        {
            var k = new BlockingCell<int>();
            SetAfter(TimingInterval, k, 123);

            ResetTimer();
            var v = k.WaitForValue(Timeout.Infinite);
            Assert.Less(TimingInterval - SafetyMargin, ElapsedMs());
            Assert.AreEqual(123, v);
        }

        [Test]
        public void TestBackgroundUpdateSucceeds()
        {
            var k = new BlockingCell<int>();
            SetAfter(TimingInterval, k, 123);

            ResetTimer();
            var v = k.WaitForValue(TimingInterval * 2);
            Assert.Less(TimingInterval - SafetyMargin, ElapsedMs());
            Assert.AreEqual(123, v);
        }

        [Test]
        public void TestBackgroundUpdateSucceedsWithTimeSpan()
        {
            var k = new BlockingCell<int>();
            SetAfter(TimingInterval, k, 123);

            ResetTimer();
            var v = k.WaitForValue(TimeSpan.FromMilliseconds(TimingInterval * 2));
            Assert.Less(TimingInterval - SafetyMargin, ElapsedMs());
            Assert.AreEqual(123, v);
        }

        [Test]
        public void TestBackgroundUpdateSucceedsWithInfiniteTimeout()
        {
            var k = new BlockingCell<int>();
            SetAfter(TimingInterval, k, 123);

            ResetTimer();
            var v = k.WaitForValue(Timeout.Infinite);
            Assert.Less(TimingInterval - SafetyMargin, ElapsedMs());
            Assert.AreEqual(123, v);
        }

        [Test]
        public void TestBackgroundUpdateSucceedsWithInfiniteTimeoutTimeSpan()
        {
            var k = new BlockingCell<int>();
            SetAfter(TimingInterval, k, 123);

            ResetTimer();
            var infiniteTimeSpan =new TimeSpan(0, 0, 0, 0, Timeout.Infinite);
            var v = k.WaitForValue(infiniteTimeSpan);
            Assert.Less(TimingInterval - SafetyMargin, ElapsedMs());
            Assert.AreEqual(123, v);
        }

        [Test]
        public void TestBackgroundUpdateFails()
        {
            var k = new BlockingCell<int>();
            SetAfter(TimingInterval * 2, k, 123);

            ResetTimer();
            Assert.Throws<TimeoutException>(() => k.WaitForValue(TimingInterval));
        }
    }
}
