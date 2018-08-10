using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Utils
{
    public static class DateConverter
    {
        public static long UtcNow => DateTimeToUnixTimestamp(DateTime.UtcNow);

        private static readonly DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, 0, System.DateTimeKind.Utc);
        public static DateTime UnixTimeStampToDateTime(long unixTimeStamp) => epoch.AddSeconds(unixTimeStamp);
        public static long DateTimeToUnixTimestamp(DateTime dateTime) => (long)(TimeZoneInfo.ConvertTimeToUtc(dateTime) - epoch).TotalSeconds;
    }
}
