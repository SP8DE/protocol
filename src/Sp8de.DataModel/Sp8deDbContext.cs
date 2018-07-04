using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace Sp8de.DataModel
{
    public class Sp8deDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
    {
        public virtual DbSet<Wallet> Wallets { get; set; }
        public virtual DbSet<UserApiKey> UserApiKeys { get; set; }
        public virtual DbSet<BlockchainAddress> BlockchainAddresses { get; set; }
        public virtual DbSet<BlockchainTransaction> BlockchainTransactions { get; set; }
        public virtual DbSet<WalletTransaction> WalletTransactions { get; set; }
        public virtual DbSet<RandomTransaction> RandomTransactions { get; set; }

        public Sp8deDbContext(DbContextOptions<Sp8deDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Wallet>(entity =>
            {
                entity.HasOne(x => x.User)
                   .WithMany(x => x.Wallets)
                   .HasForeignKey(x => x.UserId)
                   .OnDelete(DeleteBehavior.Restrict);

                entity.Property(u => u.ConcurrencyStamp).IsConcurrencyToken();
            });

            builder.Entity<BlockchainAddress>()
               .HasOne(x => x.User)
               .WithMany(x => x.BlockchainAddresses)
               .OnDelete(DeleteBehavior.Restrict)
               .HasForeignKey(x => x.UserId);

            builder.Entity<WalletTransaction>()
                   .HasOne(x => x.Wallet)
                   .WithMany(x => x.WalletTransactions)
                   .OnDelete(DeleteBehavior.Restrict)
                   .HasForeignKey(x => x.WalletId);
            
            builder.Entity<UserApiKey>(entity =>
            {
                entity.HasOne(x => x.User)
                   .WithMany(x => x.UserApiKeys)
                   .HasForeignKey(x => x.UserId)
                   .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<BlockchainTransaction>(entity =>
            {
                entity.HasOne(x => x.BlockchainAddress)
                   .WithMany(x => x.BlockchainTransactions)
                   .HasForeignKey(x => x.BlockchainAddressId)
                   .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.Hash)
                    .HasName("HashIndex")
                    .IsUnique();
            });


        }
    }
}
