using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Sp8de.DataModel.MigrationsApp
{
    class Program
    {
        static void Main(string[] args)
        {
            using (var context = new Sp8deDbContextFactory().CreateDbContext())
            {
                context.Database.EnsureCreated();
                var migrations = context.Database.GetPendingMigrations().ToArray();
                if (migrations.Length > 0)
                {
                    context.Database.Migrate();
                }
            }

            Console.WriteLine("\r\nPress any key to continue ...");
            Console.Read();
        }
    }
}
