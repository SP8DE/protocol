using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Sp8de.Manager.Web.Controllers
{
    public class DashboardController : Controller
    {
        private readonly ILogger<DashboardController> logger;

        public DashboardController()
        {

        }
        public IActionResult Index()
        {
            return View();
        }
    }
}