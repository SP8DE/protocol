using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Sp8de.DemoGame.Web.Services
{
    //public class RequestUserProvider : IRequestUserProvider
    //{
    //    private readonly IHttpContextAccessor _contextAccessor;
    //    private readonly UserManager<ApplicationUser> _userManager;

    //    public RequestUserProvider(IHttpContextAccessor contextAccessor, UserManager<ApplicationUser> userManager)
    //    {
    //        _contextAccessor = contextAccessor;
    //        _userManager = userManager;
    //    }

    //    public string GetUserId()
    //    {
    //        return _userManager.GetUserId(_contextAccessor.HttpContext.User);
    //    }
    //}

    public interface IRequestUserProvider
    {
        string GetUserId();
    }
}
