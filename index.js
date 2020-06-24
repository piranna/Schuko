/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

const {nanoid} = require('nanoid')
const {Server} = require('ws');


// Forward raw message to the other peer
function onmessage_relay({data})
{
  this.peer.send(data);
};


module.exports = function({genId = nanoid, ...wsConfig} = {})
{
  const wss = new Server({...wsConfig, noServer: true, port: null, server: null});

  // Dict to store connections
  const sockets = {};

  // When peer connection gets closed, close the other end too
  function onclose()
  {
    // Sockets were connected, just close them
    if(this.peer != null)
      this.peer.close();

    // Socket was not connected, remove it from sockets list
    else
      delete sockets[url];
  }

  return function(req, socket, head)
  {
    // Get url of the 'extension cord'
    const {url} = req;

    // No url to use as 'extension cord' id, generate one and redirect
    if(url === '/')
      return socket.end(`HTTP/1.1 302 Found\r\nLocation: /${genId()}\r\n\r\n`);

    // Url with 'extension cord' id, process it
    wss.handleUpgrade(req, socket, head, function(socket)
    {
      // Look if there was a websocket waiting with this url
      const soc = sockets[url];

      // There was a websocket waiting for this url, interconnect them
      if(soc)
      {
        // Link peers and set onmessage event to just forward between them
        socket.peer = soc;
        soc.peer = socket;

        // Forward raw message to the other peer
        socket.onmessage = onmessage_relay;
        soc.onmessage = onmessage_relay;

        // Unset waiting socket (and free the connection url)
        delete sockets[url];
      }

      // There was not a websocket waiting for this url, put it to wait itself
      else
        sockets[url] = socket;

      // When peer connection gets closed, close the other end too
      socket.onclose = onclose;
    });
  }
}
