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

  // Link peers between them
  socket.peer = soc;
  soc.peer = socket;

  // Unset waiting socket (and free the connection url)
  delete sockets[pathname];

  // Pump and send buffered data
  if(!soc.is_replacing) pump(soc)
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

function pump(soc)
{
  // Pump and send buffered messages
  const {buffer, peer} = soc

  let data
  while((data = buffer.shift())) peer.send(data)

  delete soc.buffer

  // Forward raw messages to the other peer
  soc.removeEventListener('message', onmessage_buffering)
  soc.addEventListener('message', onmessage_relay)
}

function register(socket)
{
  const {pathname, sockets} = this

  startBuffering(socket)

  sockets[pathname] = socket;
}

function startBuffering(socket)
{
  socket.buffer = []
  socket.addEventListener('message', onmessage_buffering)
}


module.exports = function({genId = nanoid, ...wsConfig} = {})
{
  const wss = new Server({...wsConfig, noServer: true, port: null, server: null});

  // Dict to store connections
  const sockets = {};

  function handleUpgrade(socket, {url})
  {
    // Use `pathname` and `search` as IDs of the 'extension cord' and peer
    let [pathname, ...search] = url.split('?');

    pathname = pathname.substring(1)
    search = search.join('?')

    socket.id = search
    socket.pathname = pathname

    // When peer connection gets closed, close the other end too
    socket.addEventListener('close', onClose, {once: true})

    // Look if there was a websocket waiting with this url
    const soc = sockets[pathname];

    // There was not a websocket waiting for this room, put it to wait itself
    if(!soc)
      return register.call({pathname, sockets}, socket)

    // There was a websocket waiting for this room with same id, replace it
    if(search.length && soc.id === search)
    {
      register.call({pathname, sockets}, socket)

      return replace(soc, socket)
    }

    // There was a websocket waiting for this url, interconnect them
    socket.addEventListener('message', onmessage_relay)

    connect.call({pathname, sockets}, socket, soc)
  }

  // When peer connection gets closed, close the other end too
  function onClose()
  {
    const {pathname, peer} = this

    // Socket was not connected, remove it from sockets list
    if(!peer)
    {
      delete sockets[pathname];
      return
    }

    // Disconect peer from ourselves
    delete peer.peer

    // Peer was annonimous, just close it
    const {id} = peer
    if(!id.length) return peer.close();

    // There was no waiting peer, register our peer as waiting
    const soc = sockets[pathname];
    if(!soc)
    {
      peer.removeEventListener('message', onmessage_relay)

      return register.call({pathname, sockets}, peer)
    }

    // Waiting named peer don't exists for this connection, connect waiting one
    if(soc.id !== id) return connect.call({pathname, sockets}, peer, soc)

    // Remove old named peer
    peer.removeEventListener('message', onmessage_relay)

    startBuffering(peer)
    replace(peer, soc)
  }

  function replace(peer, soc)
  {
    soc.is_replacing = true

    // Wait until old socket gets closed, and prepend its buffered messages to
    // the new one before start sending them
    peer.removeEventListener('close', onClose)
    peer.addEventListener('close', function()
    {
      while(this.buffer.length) soc.buffer.unshift(this.buffer.pop())

      if(soc.peer) pump(soc)

      soc.is_replacing = false
    }, {once: true})

    peer.close()
  }

  return function(req, socket, head)
  {
    // No url to use as 'extension cord' id, generate one and redirect
    if(req.url.split('?')[0] === '/')
      return socket.end(`HTTP/1.1 302 Found\r\nLocation: /${genId()}\r\n\r\n`);

    // Url with 'extension cord' id, process it
    wss.handleUpgrade(req, socket, head, handleUpgrade);
  }
}
