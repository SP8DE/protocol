using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Sp8de.DataModel.MigrationsApp
{
    public class Sp8deDbContextFactory : IDesignTimeDbContextFactory<Sp8deDbContext>
    {
        private static string _connectionString;

        public Sp8deDbContext CreateDbContext()
        {
            return CreateDbContext(null);
        }

        public Sp8deDbContext CreateDbContext(string[] args)
        {
            if (string.IsNullOrEmpty(_connectionString))
            {
                LoadConnectionString();
            }

            var builder = new DbContextOptionsBuilder<Sp8deDbContext>();
            builder.UseNpgsql(_connectionString, b => b.MigrationsAssembly("Sp8de.DataModel.MigrationsApp"));

            return new Sp8deDbContext(builder.Options);
        }

        private static void LoadConnectionString()
        {
            var builder = new ConfigurationBuilder();
            builder.AddJsonFile("appsettings.json", optional: false);

            var configuration = builder.Build();

            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }
    }
}
