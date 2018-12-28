using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading.Tasks;
using System.Timers;

namespace Sp8de.Explorer.Api.WebSocketManager
{
    public class NotificationsMessageHandler : WebSocketHandler
    {
        public List<SocketUser> socketUsers = new List<SocketUser>();

        public NotificationsMessageHandler(WebSocketConnectionManager webSocketConnectionManager) : base(webSocketConnectionManager)
        {
            var myTimer = new System.Timers.Timer();
            myTimer.Elapsed += new ElapsedEventHandler(DisplayTimeEvent);
            myTimer.Interval = 3000;
            myTimer.Start();
        }

        public override async Task ReceiveAsync(WebSocket socket, WebSocketReceiveResult result, byte[] buffer)
        {
            var socketId = WebSocketConnectionManager.GetId(socket);
            var message = Encoding.UTF8.GetString(buffer, 0, result.Count);

            try
            {
                var recieveJSON = JsonConvert.DeserializeObject<SocketJSON>(message);
                if (recieveJSON.Type.Equals("sellType"))
                {
                    bool isSell = false;
                    if (recieveJSON.Message.Equals("sell"))
                        isSell = true;

                    var existSocketUser = socketUsers.FirstOrDefault(x => x.ID.Equals(socketId));
                    if (existSocketUser == null)
                        socketUsers.Add(new SocketUser { ID = socketId });

                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }
        }

        public void DisplayTimeEvent(object source, ElapsedEventArgs e)
        {
            //foreach (var socket in this.WebSocketConnectionManager.GetAll())
            //{
            //    if (socket.Value.State == WebSocketState.Open)
            //    {
            //        var existSocketConnection = socketUsers.FirstOrDefault(x => x.ID.Equals(socket.Key));
            //    }
            //}
        }
    }

    public class SocketJSON
    {
        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class SocketUser
    {
        public string ID { get; set; }
    }
}
