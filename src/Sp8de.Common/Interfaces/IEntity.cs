﻿namespace Sp8de.Common.Interfaces
{
    public interface IEntity
    {
        string Id { get; set; }
    }

    public interface IEntity<T>
    {
        T Id { get; set; }
    }

    //public class BaseEntity : IEntity
    //{
    //    public string Id { get; set; }
    //}
}
