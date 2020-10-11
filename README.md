Schuko
======

WebSockets extension cord

Schuko is a little server build on Node.js and the 'ws' module just to connect
two WebSockets between them.

To use it, just launch the server and open two WebSockets pointing to it with
the same path, that will be used as id. Data will be buffered if second
WebSocket is still not connected. If no "path-id" is provided, it will generate
one and return a `302` redirection response. After the connection is
established, this "path-id" can be reused again if necessary to create another
interconnection.

This server is based on code from [DataChannel-polyfill]
(https://github.com/piranna/DataChannel-polyfill) backend server.

Dependencies
------------

* [nanoid](https://github.com/ai/nanoid)
* [ws](http://einaros.github.com/ws)

Used by
-------

* [eFace2Face](http://www.eface2face.com)
* [Kurento](http://www.kurento.com)
* [Copper Dating](http://copperdating.com)

Author
------

Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>

This code is MIT licensed, but if you use it please send me an email just to
know about it, thanks :-)
