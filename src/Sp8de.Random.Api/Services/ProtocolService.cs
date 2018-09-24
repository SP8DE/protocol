using Microsoft.Extensions.Logging;
using Sp8de.Common.BlockModels;
using Sp8de.Common.Interfaces;
using Sp8de.Common.RandomModels;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Random.Api.Services
{
    public class ProtocolService
    {
        private readonly IRandomContributorService contributorService;
        private readonly IWalletService walletService;
        private readonly ISp8deTransactionNodeService transactionNode;
        private readonly ILogger<ProtocolService> logger;

        public ProtocolService(IRandomContributorService contributorService, IWalletService walletService, ISp8deTransactionNodeService transactionNode, ILogger<ProtocolService> logger)
        {
            this.contributorService = contributorService;
            this.walletService = walletService;
            this.transactionNode = transactionNode;
            this.logger = logger;
        }

        public async Task<Sp8deTransaction> Create(ProtocolTransaction request, UserInfo userInfo)
        {
            var contributorCommit = await contributorService.Commit();

            await ProcessFee(userInfo);

            return null;
        }

        public async Task<Sp8deTransaction> AggregatedCommit(ProtocolTransaction request, UserInfo userInfo)
        {
            var createRequest = new CreateTransactionRequest()
            {
                Type = Sp8deTransactionType.AggregatedCommit
            };

            createRequest.AddRandomSettings(request.RandomSettings);
            createRequest.AddExtended(request.Extended);

            createRequest.InnerTransactions = request.Items.Select(x => MapToInternalTransaction(x)).ToList();

            var contributorCommit = await contributorService.Commit();

            createRequest.InnerTransactions.Add(new InternalTransaction()
            {
                Type = MapUserType(contributorCommit.Type),
                From = contributorCommit.PubKey,
                Nonce = contributorCommit.Nonce,
                Sign = contributorCommit.Sign
            });

            var result = await transactionNode.AddTransaction(createRequest);

            await ProcessFee(userInfo);

            return result;
        }

        private InternalTransaction MapToInternalTransaction(SignedItem item)
        {
            return new InternalTransaction() { Type = MapUserType(item.Type), From = item.PubKey, Nonce = item.Nonce, Sign = item.Sign, Data = item.Seed };
        }

        public async Task<Sp8deTransaction> AggregatedReveal(ProtocolTransaction request, UserInfo userInfo, Sp8deTransaction original)
        {
            var createRequest = new CreateTransactionRequest()
            {
                Type = Sp8deTransactionType.AggregatedReveal,
                DependsOn = request.DependsOn
            };

            var rtx = original.InternalTransactions.First(x => x.Type == Sp8deTransactionType.InternalValidator);

            createRequest.InnerTransactions = request.Items.Select(x => MapToInternalTransaction(x)).ToList();

            var validatorCommit = new SignedItem() { Type = UserType.Validator, PubKey = rtx.From, Nonce = rtx.Nonce, Sign = rtx.Sign };

            var reveal = await contributorService.Reveal(validatorCommit);

            createRequest.InnerTransactions.Add(new InternalTransaction()
            {
                Type = MapUserType(reveal.Type),
                From = reveal.PubKey,
                Nonce = reveal.Nonce,
                Sign = reveal.Sign,
                Data = reveal.Seed
            });

            createRequest.AddOriginalRandomSettings(original.InputData?.Items);
            createRequest.AddExtended(request.Extended);

            var result = await transactionNode.AddTransaction(createRequest);

            await ProcessFee(userInfo);

            return result;
        }

        private Sp8deTransactionType MapUserType(UserType type)
        {
            switch (type)
            {
                case UserType.Contributor:
                    return Sp8deTransactionType.InternalContributor;
                case UserType.Requester:
                    return Sp8deTransactionType.InternalRequester;
                case UserType.Validator:
                    return Sp8deTransactionType.InternalValidator;
                default:
                    throw new ArgumentException(nameof(type));
            }
        }

        private async Task ProcessFee(UserInfo userInfo)
        {
            await walletService.ProcessPayment(userInfo.UserId, -0.1m, Common.Enums.WalletTransactionType.ServiceFee);
        }
    }
}
