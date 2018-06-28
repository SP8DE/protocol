namespace Sp8de.Common.Interfaces
{
    public interface IKeySecret
    {
        KeyType Type { get; }
        string PrivateKey { get; }
        string PublicAddress { get; }
    }
}
