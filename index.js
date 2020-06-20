/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

const {Server} = require('ws');


// Forward raw message to the other peer
function onmessage_relay({data})
{
  this.peer.send(data);
};


module.exports = function(config)
{
  const wss = new Server(config);

  // Dict to store connections
  const sockets = {};

  wss.on('connection', function(socket, {url})
  {
    // Look if there was a websocket waiting with this url
    const soc = sockets[url];

    // There was a websocket waiting for this url, interconnect them
    if(soc)
    {
      // Link peers and set onmessage event to just forward between them
      socket.peer = soc;
      soc.peer = socket;

      socket.onmessage = onmessage_relay;
      soc.onmessage = onmessage_relay;

      // Unset waiting socket (and free the connection url)
      delete sockets[url];
    }

    // There was not a websocket waiting for this url, put it to wait itself
    else
      sockets[url] = socket;


    // Peer connection is closed, close the other end
    socket.onclose = function()
    {
      // Sockets were connected, just close them
      if(socket.peer != undefined)
        socket.peer.close();

      // Socket was not connected, remove it from sockets list
      else
        delete sockets[url];
    };
  });

  return wss
}
