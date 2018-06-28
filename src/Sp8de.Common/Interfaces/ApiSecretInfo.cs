using System;

namespace Sp8de.Common.Interfaces
{
    public class ApiSecretInfo
    {
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public bool IsActive { get; set; }
    }
}
