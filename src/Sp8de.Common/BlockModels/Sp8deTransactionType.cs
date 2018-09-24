namespace Sp8de.Common.BlockModels
{
    public enum Sp8deTransactionType
    {
        Simple = 1,

        AggregatedCommit = 10,
        AggregatedReveal = 11,

        InternalContributor = 20,
        InternalRequester = 21,
        InternalValidator = 23,

        System = 30
    }
}
