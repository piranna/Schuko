/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

const {Server} = require('ws');


module.exports = function(config)
{
  const wss = new Server(config);

  // Dict to store connections
  const sockets = {};

  wss.on('connection', function(socket)
  {
    // Forward raw message to the other peer
    function onmessage_proxy({data})
    {
      this.peer.send(data);
    };


    // Get path-id of the 'extension cord'
    const id = socket.upgradeReq.url;

    // Look if there was a websocket waiting with this path-id
    const soc = sockets[id];

    // There was a websocket waiting for this path-id, interconnect them
    if(soc)
    {
      // Link peers and set onmessage event to just forward between them
      socket.peer = soc;
      soc.peer = socket;

      socket.onmessage = onmessage_proxy;
      soc.onmessage = onmessage_proxy;

      // Unset waiting socket (and free the connection id)
      delete sockets[id];
    }

    // There was not a websocket waiting for this path-id, put it to wait itself
    else
      sockets[id] = socket;


    // Peer connection is closed, close the other end
    socket.onclose = function()
    {
      // Sockets were connected, just close them
      if(socket.peer != undefined)
        socket.peer.close();

      // Socket was not connected, remove it from sockets list
      else
        delete sockets[id];
    };
  });

  return wss
}
