﻿using System.Collections.Generic;
using System.Linq;

namespace BlockchainScannerApp.Models
{
	public class EthPaymentsConfig
	{
		public string Type { get; set; }
        public int Delay { get; set; }
        public void SetWallets(string[] wallets)
		{
			Wallets = wallets.Select(w => w.ToLower()).ToList();
			WalletsTrimmed = Wallets.Select(x => x.Substring(2, 40)).ToList();
		}

		public List<string> Wallets { get; private set; }
		public List<string> WalletsTrimmed { get; set; }
		public string GethAddress { get; set; }
		public string CallbackUrl { get; set; }
		public string TokenContractAddress { get; set; }
		public string TokenCurrency { get; set; }
		public string ApiKey { get; set; }
		public string ApiSecret { get; set; }
        public string PathToWallets { get; set; }
    }
}
