/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

const {nanoid} = require('nanoid')
const {Server} = require('ws');


function connect(socket, soc)
{
  const {pathname, sockets} = this

  // Pump and send buffered data
  let data
  while((data = soc.buffer.shift())) socket.send(data)

  delete soc.buffer

  soc.removeEventListener('message', onmessage_buffering)

  // Link peers and set onmessage event to just forward between them
  socket.peer = soc;
  soc.peer = socket;

  // Forward raw message to the other peer
  socket.addEventListener('message', onmessage_relay)
  soc.addEventListener('message', onmessage_relay)

  // Unset waiting socket (and free the connection url)
  delete sockets[pathname];
}

function onmessage_buffering({data})
{
  this.buffer.push(data)
}

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

  return function(req, socket, head)
  {
    // Use `pathname` and `search` as IDs of the 'extension cord' and peer
    let [pathname] = req.url.split('?');

    pathname = pathname.substring(1)

    // No url to use as 'extension cord' id, generate one and redirect
    if(!pathname.length)
      return socket.end(`HTTP/1.1 302 Found\r\nLocation: /${genId()}\r\n\r\n`);

    // When peer connection gets closed, close the other end too
    function onclose()
    {
      // Sockets were connected, just close them
      if(this.peer != null)
        this.peer.close();

      // Socket was not connected, remove it from sockets list
      else
        delete sockets[pathname];
    }

    // Url with 'extension cord' id, process it
    wss.handleUpgrade(req, socket, head, function(socket)
    {
      // Look if there was a websocket waiting with this url
      const soc = sockets[pathname];

      // There was a websocket waiting for this url, interconnect them
      if(soc)
        connect.call({pathname, sockets}, socket, soc)

      // There was not a websocket waiting for this url, put it to wait itself
      else
      {
        socket.buffer = []
        socket.addEventListener('message', onmessage_buffering)

        sockets[pathname] = socket;
      }

      // When peer connection gets closed, close the other end too
      socket.addEventListener('close', onclose)
    });
  }
}
