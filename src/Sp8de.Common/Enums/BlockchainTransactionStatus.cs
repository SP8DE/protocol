namespace Sp8de.Common.Enums
{

    public enum BlockchainTransactionStatus
    {
        Undefined = 0,
        New = 10,
        Pending = 100,
        ConfirmedByGate = 200,
        ConfirmedAndValidated = 250,
        Error = 500,
        Canceled = 550
    }
}
