#!/usr/bin/env node

// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as http from 'http'
import * as path from 'path'
import * as curl from './curl'
let PORT = parseInt(process.argv[3] || process.env.YAKBAK_PORT || '3000', 10)

try {
  if (!process.argv[2]) {
    throw new Error('file is required')
  }

  http
    .createServer(require(path.resolve(process.argv[2])))
    .on('connection', function (socket) {
      console.log('* Connection from %s port %s', socket.remoteAddress, socket.remotePort)

      socket.on('close', function () {
        console.log('* Connection closed')
      })
    })
    .on('request', function (req, res) {
      console.log(curl.request(req))
      console.log(curl.response(res))
    })
    .listen(PORT, function () {
      console.log('Server listening on port %d', PORT)
    })
} catch (err) {
  console.warn('%s: %s', err.name, err.message)
  console.warn(`Usage: yaktime <file>`)
  process.exit(1)
}
