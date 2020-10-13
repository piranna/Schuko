#!/usr/bin/env node

/*!
 * schuko: WebSockets extension cord
 * Copyright(c) 2013-2020 Jesús Leganés Combarro "Piranna" <piranna@gmail.com>
 * MIT Licensed
 */

const { createServer } = require('http');

const unifyConfig = require('unify-config')

const schuko = require('.');


const {PORT, ...config} = unifyConfig()


createServer(function(req, res)
{
  res.writeHead(426).end();
})
.on('upgrade', schuko(config))
.listen(PORT);
