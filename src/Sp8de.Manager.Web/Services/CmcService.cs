using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Net.Http;
using System.Threading.Tasks;

namespace Sp8de.Manager.Web.Services
{

    public interface ICmcClient
    {
        Task<CmcTicker> GetTickerData(int id);
    }

    public class CmcClient : ICmcClient
    {
        private readonly HttpClient client;
        private readonly ILogger<CmcClient> logger;

        public CmcClient(HttpClient client, ILogger<CmcClient> logger)
        {
            this.client = client;
            this.logger = logger;
        }

        public async Task<CmcTicker> GetTickerData(int id)
        {
            try
            {
                var response = await client.GetAsync($"v2/ticker/{id}/");
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsAsync<CmcTicker>();
            }
            catch (HttpRequestException ex)
            {
                logger.LogError($"An error occured connecting to values API {ex.ToString()}");
                return null;
            }
        }

    }

    public class USD
    {

        [JsonProperty("price")]
        public double Price { get; set; }

        [JsonProperty("volume_24h")]
        public double Volume24h { get; set; }

        [JsonProperty("market_cap")]
        public double MarketCap { get; set; }

        [JsonProperty("percent_change_1h")]
        public double PercentChange1h { get; set; }

        [JsonProperty("percent_change_24h")]
        public double PercentChange24h { get; set; }

        [JsonProperty("percent_change_7d")]
        public double PercentChange7d { get; set; }
    }

    public class Quotes
    {

        [JsonProperty("USD")]
        public USD USD { get; set; }
    }

    public class Data
    {

        [JsonProperty("id")]
        public int Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("symbol")]
        public string Symbol { get; set; }

        [JsonProperty("website_slug")]
        public string WebsiteSlug { get; set; }

        [JsonProperty("rank")]
        public int Rank { get; set; }

        [JsonProperty("circulating_supply")]
        public double CirculatingSupply { get; set; }

        [JsonProperty("total_supply")]
        public double TotalSupply { get; set; }

        [JsonProperty("max_supply")]
        public object MaxSupply { get; set; }

        [JsonProperty("quotes")]
        public Quotes Quotes { get; set; }

        [JsonProperty("last_updated")]
        public int LastUpdated { get; set; }
    }

    public class Metadata
    {

        [JsonProperty("timestamp")]
        public int Timestamp { get; set; }

        [JsonProperty("error")]
        public object Error { get; set; }
    }

    public class CmcTicker
    {

        [JsonProperty("data")]
        public Data Data { get; set; }

        [JsonProperty("metadata")]
        public Metadata Metadata { get; set; }
    }
}
