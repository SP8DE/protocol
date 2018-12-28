using System;
using System.Collections.Generic;
using System.Linq;

namespace Sp8de.Common.Utils
{
    public static class DictionaryExtensions
    {
        public static string ToQueryString(this IDictionary<string, string> values)
        {
            return string.Join("&", values.Select(x => $"{x.Key}={x.Value}"));
        }
    }
}
