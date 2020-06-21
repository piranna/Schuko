#!/usr/bin/env node

/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

const { createServer } = require('http');

const schuko = require('.');


createServer(function(req, res)
{
  res.writeHead(426).end();
})
.on('upgrade', schuko())
.listen(8080);
