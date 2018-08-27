using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Models
{
    public class Error
    {
        public string Name { get; set; }

        public string Message { get; set; }
    }

    public static class ErrorResult
    {
        public static List<Error> Create(string message) => new List<Error> { new Error() { Message = message } };
    }
}
