using Sp8de.Common.RandomModels;
using Sp8de.Protocol.Client;
using Sp8de.Protocol.Client.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    public class ChaosProtocolService : IChaosProtocolService
    {
        private readonly ChaosProtocolConfig config;
        private readonly Sp8deAPI api;

        public ChaosProtocolService(ChaosProtocolConfig config)
        {
            this.config = config;

            api = new Sp8deAPI
            {
                BaseUri = new Uri("https://protocol-api.sp8de.com/")
            };

        }
        private Dictionary<string, List<string>> AuthHeaders
        {
            get
            {
                return new Dictionary<string, List<string>>() { { "Authorization", new List<string> { "ApiKey " + this.config.ApiKey } } };
            }
        }

        public async Task<ProtocolTransactionResponse> CreateTransaction(List<Common.RandomModels.SignedItem> items, ChaosProtocolSettings settings)
        {
            try
            {
                var rs = await api.ApiTransactionCommitPostWithHttpMessagesAsync(new ProtocolTransaction()
                {
                    Type = "AggregatedCommit",
                    RandomSettings = settings.RandomSettings,
                    Items = items.Select(x => new Sp8de.Protocol.Client.Models.SignedItem()
                    {
                        Type = x.Type.ToString(),
                        Nonce = x.Nonce,
                        PubKey = x.PubKey,
                        Sign = x.Sign,
                    }).ToList()
                }, AuthHeaders);

                var result = (rs.Body as Sp8deTransaction);

                if (result != null)
                {
                    return new ProtocolTransactionResponse()
                    {

                        Id = result.Id,
                        Items = result.InternalTransactions.Select(x => new Common.RandomModels.SignedItem()
                        {
                            Type = MapType(x.Type),
                            Nonce = x.Nonce,
                            PubKey = x.FromProperty,
                            Sign = x.Sign,
                        }).ToList()
                    };
                }
            }
            catch (Exception e)
            {

                throw;
            }


            return null;
        }

        public async Task<ProtocolTransactionResponse> RevealTransaction(string transactionId, List<Common.RandomModels.RevealItem> items)
        {
            try
            {
                var rs = await api.ApiTransactionRevealPostWithHttpMessagesAsync(new ProtocolTransaction()
                {
                    Type = "AggregatedReveal",
                    Items = items.Select(x => new Sp8de.Protocol.Client.Models.SignedItem()
                    {
                        Type = x.Type.ToString(),
                        Nonce = x.Nonce,
                        PubKey = x.PubKey,
                        Seed = x.Seed,
                        Sign = x.Sign,
                    }).ToList(),
                    DependsOn = transactionId
                }, AuthHeaders);

                var result = (rs.Body as Sp8deTransaction);

                if (result != null)
                {

                    var protocolTransactionResponse = new ProtocolTransactionResponse()
                    {

                        Id = result.Id,
                        Items = result.InternalTransactions.Select(x => new Common.RandomModels.SignedItem()
                        {
                            Type = MapType(x.Type),
                            Nonce = x.Nonce,
                            PubKey = x.FromProperty,
                            Seed = x.Data,
                            Sign = x.Sign,
                        }).ToList(),
                    };

                    var external = result.Anchors.FirstOrDefault();
                    if (external != null)
                    {
                        protocolTransactionResponse.Anchor = new Common.BlockModels.Anchor()
                        {
                            Data = external.Data,
                            Timestamp = external.Timestamp ?? 0,
                            Type = external.Type,
                        };
                    }
                    return protocolTransactionResponse;
                }
            }
            catch (Exception e)
            {
                throw e;
            }

            return null;
        }

        private UserType MapType(string type)
        {
            switch (type)
            {
                case "InternalContributor":
                    return UserType.Contributor;
                case "InternalRequester":
                    return UserType.Requester;
                case "InternalValidator":
                    return UserType.Validator;
                default:
                    return UserType.Contributor;
            }
        }
    }
}
