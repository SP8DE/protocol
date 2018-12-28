using Newtonsoft.Json;
using Sp8de.EthServices.Model;
using System;
using System.Collections.Generic;
using System.Reflection.Metadata;
using System.Text;

namespace Sp8de.EthServices.Deserialisation
{
    public class MIFDeserialiser
    {
        public ConstructorMIF BuildConstructor(IDictionary<string, object> constructor)
        {
            var constructorMIF = new ConstructorMIF();
            constructorMIF.InputParameters = BuildFunctionParameters((List<object>)constructor["inputs"]);
            return constructorMIF;
        }

        public EventMIF BuildEvent(IDictionary<string, object> eventobject)
        {
            var eventABI = new EventMIF((string)eventobject["name"]);
            eventABI.InputParameters = BuildEventParameters((List<object>)eventobject["inputs"]);

            return eventABI;
        }

        public Parameter[] BuildEventParameters(List<object> inputs)
        {
            var parameters = new List<Parameter>();
            var parameterOrder = 0;
            foreach (IDictionary<string, object> input in inputs)
            {
                parameterOrder = parameterOrder + 1;
                var parameter = new Parameter((string)input["type"], (string)input["name"], parameterOrder)
                {
                    Indexed = (bool)input["indexed"]
                };
                parameters.Add(parameter);
            }

            return parameters.ToArray();
        }

        public FunctionMIF BuildFunction(IDictionary<string, object> function)
        {
            var functionABI = new FunctionMIF((string)function["name"], (bool)function["constant"],
                TryGetSerpentValue(function));
            functionABI.InputParameters = BuildFunctionParameters((List<object>)function["inputs"]);
            functionABI.OutputParameters = BuildFunctionParameters((List<object>)function["outputs"]);
            return functionABI;
        }

        public Parameter[] BuildFunctionParameters(List<object> inputs)
        {
            var parameters = new List<Parameter>();
            var parameterOrder = 0;
            foreach (IDictionary<string, object> input in inputs)
            {
                parameterOrder = parameterOrder + 1;
                var parameter = new Parameter((string)input["type"], (string)input["name"], parameterOrder,
                    TryGetSignatureValue(input));
                parameters.Add(parameter);
            }

            return parameters.ToArray();
        }

        public ContractMIF DeserialiseContract(string abi)
        {
            var convertor = new ExpandoObjectConverter();
            var contract = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(abi, convertor);
            var functions = new List<FunctionMIF>();
            var events = new List<EventMIF>();
            ConstructorMIF constructor = null;

            foreach (IDictionary<string, object> element in contract)
            {
                if ((string)element["type"] == "function")
                    functions.Add(BuildFunction(element));
                if ((string)element["type"] == "event")
                    events.Add(BuildEvent(element));
                if ((string)element["type"] == "constructor")
                    constructor = BuildConstructor(element);
            }

            var contractMIF = new ContractMIF();
            contractMIF.Functions = functions.ToArray();
            contractMIF.Constructor = constructor;
            contractMIF.Events = events.ToArray();

            return contractMIF;
        }

        public bool TryGetSerpentValue(IDictionary<string, object> function)
        {
            try
            {
                if (function.ContainsKey("serpent")) return (bool)function["serpent"];
                return false;
            }
            catch
            {
                return false;
            }
        }

        public string TryGetSignatureValue(IDictionary<string, object> parameter)
        {
            try
            {
                if (parameter.ContainsKey("signature")) return (string)parameter["signature"];
                return null;
            }
            catch
            {
                return null;
            }
        }
    }
}
