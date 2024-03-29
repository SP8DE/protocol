﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;

namespace Sp8de.EthServices.FunctionEncoding
{
    public class SignatureEncoder
    {
        private readonly Sha3Keccack sha3Keccack;

        public SignatureEncoder()
        {
            sha3Keccack = new Sha3Keccack();
        }

        public string GenerateSha3Signature(string name, Parameter[] parameters)
        {
            var signature = GenerateSignature(name, parameters);
            return sha3Keccack.CalculateHash(signature);
        }

        public string GenerateSha3Signature(string name, Parameter[] parameters, int numberOfFirstBytes)
        {
            return GenerateSha3Signature(name, parameters).Substring(0, numberOfFirstBytes * 2);
        }

        public virtual string GenerateSignature(string name, Parameter[] parameters)
        {
            var signature = new StringBuilder();
            signature.Append(name);
            signature.Append(GenerateParametersSignature(parameters));
            return signature.ToString();
        }

        public virtual string GenerateParametersSignature(Parameter[] parameters)
        {
            var signature = new StringBuilder();
            signature.Append("(");
            if (parameters != null)
            {
                var paramslist = parameters.OrderBy(x => x.Order).Select(GenerateParameteSignature).ToArray();
                var paramNames = string.Join(",", paramslist);
                signature.Append(paramNames);
            }
            signature.Append(")");
            return signature.ToString();
        }

        public virtual string GenerateParameteSignature(Parameter parameter)
        {
            if (parameter.ABIType is TupleType tupleType)
            {
                return GenerateParametersSignature(tupleType.Components);
            }
            else
            {
                return parameter.ABIType.CanonicalName;
            }
        }
    }
}
