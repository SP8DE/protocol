using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.DataModel
{
    public partial class UserApiKey
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string ApiKey { get; set; }
        public string ApiSecret { get; set; }
        public int Limit { get; set; }
        public string CustomSettings { get; set; }
        public DateTime DateCreated { get; set; }
        public bool IsActive { get; set; }
        public ApplicationUser User { get; set; }
        public Guid UserId { get; set; }
    }
}
