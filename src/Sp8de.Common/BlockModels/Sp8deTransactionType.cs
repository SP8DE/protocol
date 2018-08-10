namespace Sp8de.Common.BlockModels
{
    public enum Sp8deTransactionType
    {
        Simple = 1,

        AggregatedCommit = 10,
        AggregatedReveal = 11,

        InternalCommit = 20,
        InternalReveal = 21,

        System = 30
    }
}
