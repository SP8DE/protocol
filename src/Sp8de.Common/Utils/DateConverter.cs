using System;
using System.Collections.Generic;
using System.Text;

namespace Sp8de.Common.Utils
{
    public static class DateConverter
    {
        public static DateTime UnixTimeStampToDateTime(long unixTimeStamp) => new DateTime(1970, 1, 1, 0, 0, 0, 0).AddSeconds(unixTimeStamp);

        public static long DateTimeToUnixTimestamp(DateTime dateTime) => (long)(TimeZoneInfo.ConvertTimeToUtc(dateTime) - new DateTime(1970, 1, 1, 0, 0, 0, 0, System.DateTimeKind.Utc)).TotalSeconds;
    }
}
