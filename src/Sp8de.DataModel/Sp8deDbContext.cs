using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Sp8de.DataModel
{
    public class Sp8deDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public virtual DbSet<Wallet> Wallets { get; set; }
        public virtual DbSet<UserApiKey> UserApiKeys { get; set; }
        public virtual DbSet<BlockchainAddress> BlockchainAddresses { get; set; }
        public virtual DbSet<BlockchainTransaction> BlockchainTransactions { get; set; }
        public virtual DbSet<WalletTransaction> WalletTransactions { get; set; }

        public Sp8deDbContext(DbContextOptions<Sp8deDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Wallet>(ConfigureWallet);

            builder.Entity<BlockchainAddress>(ConfigureBlockchainAddress);

            builder.Entity<UserApiKey>(ConfigureUserApiKey);

            builder.Entity<WalletTransaction>(ConfigureWalletTransaction);

            builder.Entity<BlockchainTransaction>(ConfigureBlockchainTransaction);
        }

        private void ConfigureBlockchainTransaction(EntityTypeBuilder<BlockchainTransaction> builder)
        {
            builder.HasOne(x => x.BlockchainAddress)
               .WithMany(x => x.BlockchainTransactions)
               .HasForeignKey(x => x.BlockchainAddressId)
               .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(e => e.Hash)
                .HasName("HashIndex")
                .IsUnique();
        }

        private void ConfigureWalletTransaction(EntityTypeBuilder<WalletTransaction> builder)
        {
            builder.HasOne(x => x.Wallet)
                   .WithMany(x => x.WalletTransactions)
                   .OnDelete(DeleteBehavior.Restrict)
                   .HasForeignKey(x => x.WalletId);
        }

        private void ConfigureUserApiKey(EntityTypeBuilder<UserApiKey> builder)
        {
            builder.HasOne(x => x.User)
              .WithMany(x => x.UserApiKeys)
              .HasForeignKey(x => x.UserId)
              .OnDelete(DeleteBehavior.Restrict);
        }

        private void ConfigureWallet(EntityTypeBuilder<Wallet> builder)
        {
            builder.HasOne(x => x.User)
                   .WithMany(x => x.Wallets)
                   .HasForeignKey(x => x.UserId)
                   .OnDelete(DeleteBehavior.Restrict);

            builder.Property(u => u.ConcurrencyStamp).IsConcurrencyToken();
        }

        private void ConfigureBlockchainAddress(EntityTypeBuilder<BlockchainAddress> builder)
        {
            builder.HasOne(x => x.User)
               .WithMany(x => x.BlockchainAddresses)
               .OnDelete(DeleteBehavior.Restrict)
               .HasForeignKey(x => x.UserId);
        }
    }
}
