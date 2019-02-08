// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as http from 'http'

import Debug from 'debug'
import { AddressInfo } from 'net'
import { YakTimeServer } from '../../util'

const debug = Debug('yaktime:test-server')

export interface TestServer extends http.Server {
  requests: http.IncomingMessage[]
  teardown: (cb: (() => {}) | null) => Promise<void> | undefined
}

/**
 * Creates a test HTTP server.
 * @param {Function} done
 * @param {boolean} failRequest - Specifies whether response has to be error or not
 * @returns {http.Server}
 */

export function createServer (cb: ((e: Error) => void) | null, failRequest = false, handler?: YakTimeServer): Promise<TestServer> | TestServer {
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

  let server = http.createServer(wrapper) as TestServer

  server.requests = requests

  server.teardown = function (done) {
    const port = (server.address() as AddressInfo).port
    debug(`Closing on ${port}`)
    if (done == null) {
      return new Promise(resolve => {
        this.close(resolve)
      })
    }
    this.close(done)
    return
  }

  if (cb == null) {
    return new Promise((resolve, reject) => {
      server.listen((e: any) => {
        const port = (server.address() as AddressInfo).port
        debug(`Listening on ${port}`)
        e != null ? reject(e) : resolve(server)
      })
    })
  }

  return server.listen((e: any) => {
    const port = (server.address() as AddressInfo).port
    debug(`Listening on ${port}`)
    cb(e)
  })
}
