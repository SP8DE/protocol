using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Interfaces;

namespace Sp8de.Manager.Web.Controllers
{
    public class ApiKeyController : Controller
    {
        private readonly IApiKeyManager apiKeyManager;

        public ApiKeyController(IApiKeyManager apiKeyManager)
        {
            this.apiKeyManager = apiKeyManager;
        }

        public IActionResult Index()
        {
            var items = apiKeyManager.GetList(User.GetUserId());
            return View(items);
        }

        public IActionResult Generate()
        {
            var model = apiKeyManager.Generate(User.GetUserId());
            return View(model);
        }

        public async Task<IActionResult> Remove(string apiKey)
        {
            var rs = await apiKeyManager.Remove(apiKey, User.GetUserId());

            return View();
        }
    }
}