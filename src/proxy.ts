// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.
import * as https from 'https'
import * as http from 'http'
import Debug from 'debug'
import * as url from 'url'
import invariant from 'invariant'

const debug = Debug('yaktime:proxy')

/**
 * Protocol to module map, natch.
 * @private
 */

const mods = { 'http:': http, 'https:': https }

interface YakTimeIncomingMessage extends http.IncomingMessage {
  req: http.ClientRequest
}

/**
 * Proxy `req` to `host` and yield the response.
 * @param - req
 * @param -  body
 * @param -  host
 */

export function proxy (res: http.IncomingMessage, body: Buffer[], host: string): Promise<YakTimeIncomingMessage> {
  invariant(res.method != null, 'HTTP Method has to be defined')
  debug(`${res.method} ${res.url}`)
  return new Promise(function (resolve) {
    const uri = url.parse(host)
    const mod = mods[uri.protocol as keyof typeof mods] || http
    const request = {
      hostname: uri.hostname,
      port: uri.port,
      method: res.method,
      path: res.url,
      headers: { ...res.headers, host: uri.host },
      servername: uri.hostname,
      rejectUnauthorized: false
    }
    const preq = mod.request(request, function (pres) {
      const statusCode = pres.statusCode || 0
      if (statusCode >= 300 && statusCode < 400) {
        const location = pres.headers['location'] || ''
        debug('redirect', 'rewriting', uri.host, '=>', res.headers['host'])
        pres.headers['location'] = location.replace(uri.host || '', res.headers['host'] || '')
      }
      resolve(pres as YakTimeIncomingMessage)
    })

    debug('req', res.url, 'host', uri.host)

    body.forEach(function (buf) {
      preq.write(buf)
    })

    preq.end()
  })
}
