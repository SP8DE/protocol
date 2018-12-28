using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RabbitMQ.Client.Events;

namespace RabbitMQ.Client.Impl
{
    sealed class ModelShutdown : Work
    {
        readonly ShutdownEventArgs reason;

        public ModelShutdown(IBasicConsumer consumer, ShutdownEventArgs reason) : base(consumer)
        {
            this.reason = reason;
        }

        protected override async Task Execute(ModelBase model, IAsyncBasicConsumer consumer)
        {
            try
            {
                await consumer.HandleModelShutdown(model, reason).ConfigureAwait(false);
            }
            catch (Exception e)
            {
                var details = new Dictionary<string, object>()
                {
                    { "consumer", consumer },
                    { "context", "HandleModelShutdown" }
                };
                model.OnCallbackException(CallbackExceptionEventArgs.Build(e, details));
            }
        }
    }
}