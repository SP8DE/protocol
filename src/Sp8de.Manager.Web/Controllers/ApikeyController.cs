using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sp8de.Common.Interfaces;

namespace Sp8de.Manager.Web.Controllers
{
    [Authorize]
    public class ApiKeyController : Controller
    {
        private readonly IApiKeyManager apiKeyManager;

        public ApiKeyController(IApiKeyManager apiKeyManager)
        {
            this.apiKeyManager = apiKeyManager;
        }

        public async Task<IActionResult> Index()
        {
            var items = await apiKeyManager.GetList(User.GetUserId());
            return View(items);
        }

        public async Task<IActionResult> Generate()
        {
            var model = await apiKeyManager.Generate(User.GetUserId());
            return View(model);
        }

        public async Task<IActionResult> Remove(string apiKey)
        {
            var rs = await apiKeyManager.Remove(apiKey, User.GetUserId());
            return View(rs);
        }
    }
}