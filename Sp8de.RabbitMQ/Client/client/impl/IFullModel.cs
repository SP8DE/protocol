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

using System;
using System.Collections.Generic;
using RabbitMQ.Client.Apigen.Attributes;

namespace RabbitMQ.Client.Impl
{
    ///<summary>Not part of the public API. Extension of IModel to
    ///include utilities and connection-setup routines needed by the
    ///implementation side.</summary>
    ///
    ///<remarks>This interface is used by the API autogeneration
    ///process. The AMQP XML specifications are read by the spec
    ///compilation tool, and after the basic method interface and
    ///implementation classes are generated, this interface is
    ///scanned, and a spec-version-specific implementation is
    ///autogenerated. Annotations are used on certain methods, return
    ///types, and parameters, to customise the details of the
    ///autogeneration process.</remarks>
    ///
    ///<see cref="RabbitMQ.Client.Impl.ModelBase"/>
    ///<see cref="RabbitMQ.Client.Framing.Impl.Model"/>
    public interface IFullModel : IModel
    {
        ///<summary>Sends a Connection.TuneOk. Used during connection
        ///initialisation.</summary>
        void ConnectionTuneOk(ushort channelMax,
            uint frameMax,
            ushort heartbeat);

        ///<summary>Handle incoming Basic.Ack methods. Signals a
        ///BasicAckEvent.</summary>
        void HandleBasicAck(ulong deliveryTag,
            bool multiple);

        void HandleBasicCancel(string consumerTag, bool nowait);

        ///<summary>Handle incoming Basic.CancelOk methods.</summary>
        void HandleBasicCancelOk(string consumerTag);

        ///<summary>Handle incoming Basic.ConsumeOk methods.</summary>
        void HandleBasicConsumeOk(string consumerTag);

        ///<summary>Handle incoming Basic.Deliver methods. Dispatches
        ///to waiting consumers.</summary>
        void HandleBasicDeliver(string consumerTag,
            ulong deliveryTag,
            bool redelivered,
            string exchange,
            string routingKey,
            [AmqpContentHeaderMapping] IBasicProperties basicProperties,
            [AmqpContentBodyMapping] byte[] body);

        ///<summary>Handle incoming Basic.GetEmpty methods. Routes the
        ///information to a waiting Basic.Get continuation.</summary>
        ///<remarks>
        /// Note that the clusterId field is ignored, as in the
        /// specification it notes that it is "deprecated pending
        /// review".
        ///</remarks>
        void HandleBasicGetEmpty();

        ///<summary>Handle incoming Basic.GetOk methods. Routes the
        ///information to a waiting Basic.Get continuation.</summary>
        void HandleBasicGetOk(ulong deliveryTag,
            bool redelivered,
            string exchange,
            string routingKey,
            uint messageCount,
            [AmqpContentHeaderMapping] IBasicProperties basicProperties,
            [AmqpContentBodyMapping] byte[] body);

        ///<summary>Handle incoming Basic.Nack methods. Signals a
        ///BasicNackEvent.</summary>
        void HandleBasicNack(ulong deliveryTag,
            bool multiple,
            bool requeue);

        ///<summary>Handle incoming Basic.RecoverOk methods
        ///received in reply to Basic.Recover.
        ///</summary>
        void HandleBasicRecoverOk();

        ///<summary>Handle incoming Basic.Return methods. Signals a
        ///BasicReturnEvent.</summary>
        void HandleBasicReturn(ushort replyCode,
            string replyText,
            string exchange,
            string routingKey,
            [AmqpContentHeaderMapping] IBasicProperties basicProperties,
            [AmqpContentBodyMapping] byte[] body);

        ///<summary>Handle an incoming Channel.Close. Shuts down the
        ///session and model.</summary>
        void HandleChannelClose(ushort replyCode,
            string replyText,
            ushort classId,
            ushort methodId);

        ///<summary>Handle an incoming Channel.CloseOk.</summary>
        void HandleChannelCloseOk();

        ///<summary>Handle incoming Channel.Flow methods. Either
        ///stops or resumes sending the methods that have content.</summary>
        void HandleChannelFlow(bool active);

        ///<summary>Handle an incoming Connection.Blocked.</summary>
        [AmqpMethodMapping(null, "connection", "blocked")]
        void HandleConnectionBlocked(string reason);

        ///<summary>Handle an incoming Connection.Close. Shuts down the
        ///connection and all sessions and models.</summary>
        void HandleConnectionClose(ushort replyCode,
            string replyText,
            ushort classId,
            ushort methodId);

        ///<summary>Handle an incoming Connection.OpenOk.</summary>
        void HandleConnectionOpenOk([AmqpFieldMapping("RabbitMQ.Client.Framing", "reserved1")] string knownHosts);

        ///////////////////////////////////////////////////////////////////////////
        // Connection-related methods, for use in channel 0 during
        // connection startup/shutdown.

        ///<summary>Handle incoming Connection.Secure
        ///methods.</summary>
        void HandleConnectionSecure(byte[] challenge);

        ///<summary>Handle an incoming Connection.Start. Used during
        ///connection initialisation.</summary>
        void HandleConnectionStart(byte versionMajor,
            byte versionMinor,
            IDictionary<string, object> serverProperties,
            byte[] mechanisms,
            byte[] locales);

        ///<summary>Handle incoming Connection.Tune
        ///methods.</summary>
        void HandleConnectionTune(ushort channelMax,
            uint frameMax,
            ushort heartbeat);

        ///<summary>Handle an incominga Connection.Unblocked.</summary>
        void HandleConnectionUnblocked();

        ///<summary>Handle incoming Queue.DeclareOk methods. Routes the
        ///information to a waiting Queue.DeclareOk continuation.</summary>
        void HandleQueueDeclareOk(string queue,
            uint messageCount,
            uint consumerCount);

        ///<summary>Used to send a Basic.Cancel method. The public
        ///consume API calls this while also managing internal
        ///datastructures.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "basic", "cancel")]
        void _Private_BasicCancel(string consumerTag,
            bool nowait);

        ///<summary>Used to send a Basic.Consume method. The public
        ///consume API calls this while also managing internal
        ///datastructures.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "basic", "consume")]
        void _Private_BasicConsume(string queue,
            string consumerTag,
            bool noLocal,
            [AmqpFieldMapping(null, "noAck")] bool autoAck,
            bool exclusive,
            bool nowait,
            IDictionary<string, object> arguments);

        ///<summary>Used to send a Basic.Get. Basic.Get is a special
        ///case, since it can result in a Basic.GetOk or a
        ///Basic.GetEmpty, so this level of manual control is
        ///required.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "basic", "get")]
        void _Private_BasicGet(string queue,
            [AmqpFieldMapping(null, "noAck")] bool autoAck);

        ///<summary>Used to send a Basic.Publish method. Called by the
        ///public publish method after potential null-reference issues
        ///have been rectified.</summary>
        [AmqpMethodMapping(null, "basic", "publish")]
        void _Private_BasicPublish(string exchange,
            string routingKey,
            bool mandatory,
            [AmqpContentHeaderMapping] IBasicProperties basicProperties,
            [AmqpContentBodyMapping] byte[] body);

        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "basic", "recover")]
        void _Private_BasicRecover(bool requeue);

        ///<summary>Used to send a Channel.Close. Called during
        ///session shutdown.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "channel", "close")]
        void _Private_ChannelClose(ushort replyCode,
            string replyText,
            ushort classId,
            ushort methodId);

        ///<summary>Used to send a Channel.CloseOk. Called during
        ///session shutdown.</summary>
        [AmqpMethodMapping(null, "channel", "close-ok")]
        void _Private_ChannelCloseOk();

        ///<summary>Used to send a Channel.FlowOk. Confirms that
        ///Channel.Flow from the broker was processed.</summary>
        [AmqpMethodMapping(null, "channel", "flow-ok")]
        void _Private_ChannelFlowOk(bool active);

        ///<summary>Used to send a Channel.Open. Called during session
        ///initialisation.</summary>
        [AmqpMethodMapping(null, "channel", "open")]
        void _Private_ChannelOpen([AmqpFieldMapping("RabbitMQ.Client.Framing",
            "reserved1")] string outOfBand);

        ///<summary>Used to send a Confirm.Select method. The public
        ///confirm API calls this while also managing internal
        ///datastructures.</summary>
        [AmqpMethodMapping(null, "confirm", "select")]
        void _Private_ConfirmSelect([AmqpNowaitArgument(null)] bool nowait);

        ///<summary>Used to send a Connection.Close. Called during
        ///connection shutdown.</summary>
        [AmqpMethodMapping(null, "connection", "close")]
        void _Private_ConnectionClose(ushort replyCode,
            string replyText,
            ushort classId,
            ushort methodId);

        ///<summary>Used to send a Connection.CloseOk. Called during
        ///connection shutdown.</summary>
        [AmqpMethodMapping(null, "connection", "close-ok")]
        void _Private_ConnectionCloseOk();

        ///<summary>Used to send a Connection.Open. Called during
        ///connection startup.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "connection", "open")]
        void _Private_ConnectionOpen(string virtualHost,
            [AmqpFieldMapping("RabbitMQ.Client.Framing", "reserved1")] string capabilities,
            [AmqpFieldMapping("RabbitMQ.Client.Framing", "reserved2")] bool insist);

        ///<summary>Used to send a Connection.SecureOk. Again, this is
        ///special, like Basic.Get.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "connection", "secure-ok")]
        void _Private_ConnectionSecureOk(byte[] response);

        ///<summary>Used to send a Connection.StartOk. This is
        ///special, like Basic.Get.</summary>
        [AmqpForceOneWay]
        [AmqpMethodMapping(null, "connection", "start-ok")]
        void _Private_ConnectionStartOk(IDictionary<string, object> clientProperties,
            string mechanism,
            byte[] response,
            string locale);

        ///<summary>Used to send a Exchange.Bind method. Called by the
        ///public bind method.
        ///</summary>
        [AmqpMethodMapping(null, "exchange", "bind")]
        void _Private_ExchangeBind(string destination,
            string source,
            string routingKey,
            [AmqpNowaitArgument(null)] bool nowait,
            IDictionary<string, object> arguments);

        ///<summary>Used to send a Exchange.Declare method. Called by the
        ///public declare method.
        ///</summary>
        [AmqpMethodMapping(null, "exchange", "declare")]
        void _Private_ExchangeDeclare(string exchange,
            string type,
            bool passive,
            bool durable,
            bool autoDelete,
            bool @internal,
            [AmqpNowaitArgument(null)] bool nowait,
            IDictionary<string, object> arguments);

        ///<summary>Used to send a Exchange.Delete method. Called by the
        ///public delete method.
        ///</summary>
        [AmqpMethodMapping(null, "exchange", "delete")]
        void _Private_ExchangeDelete(string exchange,
            bool ifUnused,
            [AmqpNowaitArgument(null)] bool nowait);

        ///<summary>Used to send a Exchange.Unbind method. Called by the
        ///public unbind method.
        ///</summary>
        [AmqpMethodMapping(null, "exchange", "unbind")]
        void _Private_ExchangeUnbind(string destination,
            string source,
            string routingKey,
            [AmqpNowaitArgument(null)] bool nowait,
            IDictionary<string, object> arguments);

        ///<summary>Used to send a Queue.Bind method. Called by the
        ///public bind method.</summary>
        [AmqpMethodMapping(null, "queue", "bind")]
        void _Private_QueueBind(string queue,
            string exchange,
            string routingKey,
            [AmqpNowaitArgument(null)] bool nowait,
            IDictionary<string, object> arguments);

        ///<summary>Used to send a Queue.Declare method. Called by the
        ///public declare method.</summary>
        [AmqpMethodMapping(null, "queue", "declare")]
        [AmqpForceOneWay]
        void _Private_QueueDeclare(string queue,
            bool passive,
            bool durable,
            bool exclusive,
            bool autoDelete,
            [AmqpNowaitArgument(null)] bool nowait,
            IDictionary<string, object> arguments);

        ///<summary>Used to send a Queue.Delete method. Called by the
        ///public delete method.</summary>
        [AmqpMethodMapping(null, "queue", "delete")]
        [return: AmqpFieldMapping(null, "messageCount")]
        uint _Private_QueueDelete(string queue,
            bool ifUnused,
            bool ifEmpty,
            [AmqpNowaitArgument(null, "0xFFFFFFFF")] bool nowait);

        ///<summary>Used to send a Queue.Purge method. Called by the
        ///public purge method.</summary>
        [return: AmqpFieldMapping(null, "messageCount")]
        [AmqpMethodMapping(null, "queue", "purge")]
        uint _Private_QueuePurge(string queue,
            [AmqpNowaitArgument(null, "0xFFFFFFFF")] bool nowait);
    }


    ///<summary>Essential information from an incoming Connection.Tune
    ///method.</summary>
    public struct ConnectionTuneDetails
    {
        ///<summary>The peer's suggested channel-max parameter.</summary>
        public ushort m_channelMax;

        ///<summary>The peer's suggested frame-max parameter.</summary>
        public uint m_frameMax;

        ///<summary>The peer's suggested heartbeat parameter.</summary>
        public ushort m_heartbeat;
    }


    public class ConnectionSecureOrTune
    {
        public byte[] m_challenge;
        public ConnectionTuneDetails m_tuneDetails;
    }
}

namespace RabbitMQ.Client.Apigen.Attributes
{
    ///<summary>Base class for attributes for controlling the API
    ///autogeneration process.</summary>
    public abstract class AmqpApigenAttribute : Attribute
    {
        ///<summary>The specification namespace (i.e. version) that
        ///this attribute applies to, or null for all specification
        ///versions.</summary>
        public string m_namespaceName;

        public AmqpApigenAttribute(string namespaceName)
        {
            m_namespaceName = namespaceName;
        }
    }


    ///<summary>Causes the API generator to ignore the attributed method.</summary>
    ///
    ///<remarks>Mostly used to declare convenience overloads of
    ///various AMQP methods in the IModel interface. Also used
    ///to omit an autogenerated implementation of a method which
    ///is not required for one protocol version. The API
    ///autogeneration process should of course not attempt to produce
    ///an implementation of the convenience methods, as they will be
    ///implemented by hand with sensible defaults, delegating to the
    ///autogenerated variant of the method concerned.</remarks>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true)]
    public class AmqpMethodDoNotImplementAttribute : AmqpApigenAttribute
    {
        public AmqpMethodDoNotImplementAttribute(string namespaceName)
            : base(namespaceName)
        {
        }
    }


    ///<summary>Causes the API generator to generate asynchronous
    ///receive code for the attributed method.</summary>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true)]
    public class AmqpAsynchronousHandlerAttribute : AmqpApigenAttribute
    {
        public AmqpAsynchronousHandlerAttribute(string namespaceName)
            : base(namespaceName)
        {
        }
    }


    ///<summary>Causes the API generator to generate
    ///exception-throwing code for, instead of simply ignoring, the
    ///attributed method.</summary>
    ///
    ///<see cref="AmqpMethodDoNotImplementAttribute"/>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true)]
    public class AmqpUnsupportedAttribute : AmqpApigenAttribute
    {
        public AmqpUnsupportedAttribute(string namespaceName)
            : base(namespaceName)
        {
        }
    }


    ///<summary>Informs the API generator which AMQP method field to
    ///use for either a parameter in a request, or for a simple result
    ///in a reply.</summary>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true)]
    public class AmqpFieldMappingAttribute : AmqpApigenAttribute
    {
        public string m_fieldName;

        public AmqpFieldMappingAttribute(string namespaceName,
            string fieldName)
            : base(namespaceName)
        {
            m_fieldName = fieldName;
        }
    }


    ///<summary>Informs the API generator which AMQP method to use for
    ///either a request (if applied to an IModel method) or a reply
    ///(if applied to an IModel method result).</summary>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true)]
    public class AmqpMethodMappingAttribute : AmqpApigenAttribute
    {
        public string m_className;
        public string m_methodName;

        public AmqpMethodMappingAttribute(string namespaceName,
            string className,
            string methodName)
            : base(namespaceName)
        {
            m_className = className;
            m_methodName = methodName;
        }
    }


    ///<summary>This attribute, if placed on a parameter in an IModel
    ///method, causes it to be interpreted as a "nowait" parameter for
    ///the purposes of autogenerated RPC reply continuation management
    ///and control.</summary>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true)]
    public class AmqpNowaitArgumentAttribute : AmqpApigenAttribute
    {
        public string m_replacementExpression;

        public AmqpNowaitArgumentAttribute(string namespaceName)
            : this(namespaceName, null)
        {
        }

        public AmqpNowaitArgumentAttribute(string namespaceName,
            string replacementExpression)
            : base(namespaceName)
        {
            m_replacementExpression = replacementExpression;
        }
    }


    ///<summary>This attribute, if placed on a method in IModel,
    ///causes the method to be interpreted as a factory method
    ///producing a protocol-specific implementation of a common
    ///content header interface.</summary>
    public class AmqpContentHeaderFactoryAttribute : Attribute
    {
        public string m_contentClass;

        public AmqpContentHeaderFactoryAttribute(string contentClass)
        {
            m_contentClass = contentClass;
        }
    }


    ///<summary>This attribute, if placed on a parameter in a
    ///content-carrying IModel method, causes it to be sent as part of
    ///the content header frame.</summary>
    public class AmqpContentHeaderMappingAttribute : Attribute
    {
    }


    ///<summary>This attribute, if placed on a parameter in a
    ///content-carrying IModel method, causes it to be sent as part of
    ///the content body frame.</summary>
    public class AmqpContentBodyMappingAttribute : Attribute
    {
    }


    ///<summary>This attribute, placed on an IModel method, causes
    ///what would normally be an RPC, sent with ModelRpc, to be sent
    ///as if it were oneway, with ModelSend. The assumption that this
    ///is for a custom continuation (e.g. for BasicConsume/BasicCancel
    ///etc.)</summary>
    public class AmqpForceOneWayAttribute : Attribute
    {
    }
}
