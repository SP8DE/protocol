using Marten;
using System;

namespace Sp8de.Seed.ConsoleApp
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");

            var store = DocumentStore.For("host=localhost;database=marten_test;password=zxczxcz;username=postgres");
        }
    }
}
