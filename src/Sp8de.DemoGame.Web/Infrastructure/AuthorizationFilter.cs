using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Swashbuckle.AspNetCore.Swagger;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Collections.Generic;
using System.Linq;

namespace Sp8de.DemoGame.Web.Infrastructure
{
    public class AuthorizationFilter : IOperationFilter
    {
        public void ApplyByMethod(Operation operation, OperationFilterContext context)
        {
            var filterPipeline = context.ApiDescription.ActionDescriptor.FilterDescriptors;
            var isAuthorized = filterPipeline.Select(filterInfo => filterInfo.Filter).Any(filter => filter is AuthorizeFilter);
            var allowAnonymous = filterPipeline.Select(filterInfo => filterInfo.Filter).Any(filter => filter is IAllowAnonymousFilter);

            if (!isAuthorized || allowAnonymous)
                return;

            if (operation.Parameters == null)
                operation.Parameters = new List<IParameter>();

            operation.Parameters.Add(new NonBodyParameter
            {
                Name = "Authorization",
                In = "header",
                Description = "JWT access token",
                Required = true,
                Type = "string"
            });
        }

        public void Apply(Operation operation, OperationFilterContext context)
        {
            var authAttributes = context.ApiDescription
                .ControllerAttributes()
                .Union(context.ApiDescription.ActionAttributes())
                .OfType<AuthorizeAttribute>()
                .ToArray();

            if (authAttributes.Any())
                operation.Responses.Add(
                    "401", new Response { Description = "Unauthorized access to resource" });

            if (authAttributes.Any(x => x.Roles == "admin"))
                operation.Responses.Add(
                    "403", new Response { Description = "Forbidden - user not authorized to access resource" });
        }
    }
}
