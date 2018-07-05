using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.Casino.Web.Models
{
    public enum GameType
    {
        TossCoin = 1,
        Dice = 6,
        NumberRange = 10,
        SingleZeroWheel = 36,
        DoubleZeroWheel = 37
    }

    public class GameStartRequest
    {
        public GameType Type { get; set; }
        public int Bet { get; set; }
        public decimal BetAmount { get; set; }
        public string PubKey { get; set; }
        public string Sign { get; set; }
    }

    public class GameStartResponse
    {
        public string GameId { get; set; }
        public IList<SignedItem> Items { get; set; }
    }

    public class GameFinishRequest
    {
        public string GameId { get; set; }
        public string PubKey { get; set; }
        public string Salt { get; set; }
        public string Sign { get; set; }
        public long Seed { get; set; }
    }

    public class GameFinishResponse
    {
        public string GameId { get; set; }

        public bool IsWinner { get; set; }
        public decimal WinAmount { get; set; }

        public IList<RevealItem> Items { get; set; }
    }

    public class SignedItem
    {
        public string PubKey { get; set; }
        public string Salt { get; set; }
        public string Sign { get; set; }
    }

    public class RevealItem : SignedItem
    {
        public long Seed { get; set; }
    }
}
