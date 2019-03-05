// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as http from 'http'

import Debug from 'debug'
import { AddressInfo } from 'net'
import { YakTimeServer } from '../../util'
import { createAsyncServer, AsyncServer } from '../../AsyncServer'

const debug = Debug('yaktime:test-server')

export interface TestServer extends AsyncServer {
  requests: http.IncomingMessage[]
}

/**
 * Creates a test HTTP server.
 */

export async function createServer (failRequest = false, handler?: YakTimeServer): Promise<TestServer> {
  const requests: http.IncomingMessage[] = []

  let defaultHandler: YakTimeServer = (req, res) => {
    res.statusCode = failRequest === true ? 404 : 201
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Date', 'Sat, 26 Oct 1985 08:20:00 GMT')

    req.resume()

    req.on('end', function () {
      res.end('OK')
    })
  }

  const wrapper: YakTimeServer = (req, res) => {
    debug('storing request', requests.length + 1)
    requests.push(req)
    const h = handler || defaultHandler
    h(req, res)
  }

  let server = createAsyncServer(wrapper) as TestServer

  server.requests = requests

  await server.listenAsync()
  const port = (server.address() as AddressInfo).port
  debug(`Listening on ${port}`)

  server.once('close', () => {
    debug(`Closed on ${port}`)
  })

  return server
}
