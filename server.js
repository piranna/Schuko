#!/usr/bin/env node

/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 8080});

//Dict to store connections
wss.sockets = {};

wss.on('connection', function(socket)
{
  // Forward raw message to the other peer
  function onmessage_proxy(message)
  {
    this.peer.send(message.data);
  };


  // Get path-id of the 'extension cord'
  var id = socket.upgradeReq.url;

  // Look if there was a websocket waiting with this path-id
  var soc = wss.sockets[id];

  // There was a websocket waiting for this path-id, interconnect them
  if(soc)
  {
    // Link peers and set onmessage event to just forward between them
    socket.peer = soc;
    soc.peer = socket;

    socket.onmessage = onmessage_proxy;
    soc.onmessage = onmessage_proxy;

    // Unset waiting socket (and free the connection id)
    delete wss.sockets[id];
  }

  // There was not a websocket waiting for this path-id, put it to wait itself
  else
    wss.sockets[id] = socket;


  // Peer connection is closed, close the other end
  socket.onclose = function()
  {
    // Sockets were connected, just close them
    if(socket.peer != undefined)
       socket.peer.close();

    // Socket was not connected, remove it from sockets list
    else
      delete wss.sockets[id];
  };
});