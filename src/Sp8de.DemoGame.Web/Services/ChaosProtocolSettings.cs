using Sp8de.DemoGame.Web.Models;
using Sp8de.Protocol.Client.Models;
using System;

namespace Sp8de.DemoGame.Web.Services
{
    public class ChaosProtocolSettings
    {
        public static ChaosProtocolSettings Default { get { return ByGameType(GameType.Dice); } }

        public static ChaosProtocolSettings ByGameType(GameType type)
        {
            switch (type)
            {
                case GameType.TossCoin:
                    return new ChaosProtocolSettings()
                    {
                        RandomSettings = new RandomSettings()
                        {
                            Type = "Boolen",
                            Count = 1,
                            RangeMin = 0,
                            RangeMax = 1,
                            Algorithm = "MT19937"
                        }
                    };
                case GameType.Dice:
                    return new ChaosProtocolSettings()
                    {
                        RandomSettings = new RandomSettings()
                        {
                            Type = "Dice",
                            Count = 1,
                            RangeMin = 1,
                            RangeMax = 6,
                            Algorithm = "MT19937"
                        }
                    };
                case GameType.NumberRange:
                    return new ChaosProtocolSettings()
                    {
                        RandomSettings = new RandomSettings()
                        {
                            Type = "RepeatableNumber",
                            Count = 10,
                            RangeMin = 1,
                            RangeMax = 100,
                            Algorithm = "MT19937"
                        }
                    };
                case GameType.SingleZeroWheel:
                    return new ChaosProtocolSettings()
                    {
                        RandomSettings = new RandomSettings()
                        {
                            Type = "RepeatableNumber",
                            Count = 10,
                            RangeMin = 1,
                            RangeMax = 36,
                            Algorithm = "MT19937"
                        }
                    };
                case GameType.DoubleZeroWheel:
                    return new ChaosProtocolSettings()
                    {
                        RandomSettings = new RandomSettings()
                        {
                            Type = "RepeatableNumber",
                            Count = 10,
                            RangeMin = 1,
                            RangeMax = 37,
                            Algorithm = "MT19937"
                        }
                    };
                default:
                    throw new NotImplementedException();
            }

        }

        public RandomSettings RandomSettings { get; set; }
    }
}
