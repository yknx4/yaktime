// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import invariant from 'invariant'

import Debug from 'debug'
import { buffer } from './buffer'
import { mkdir, YakTimeOpts, YakTimeServer } from './util'
import * as curl from './curl'
import { Recorder } from './Recorder'

const debug = Debug('yaktime:server')

/**
 * Returns a function of the signature function (req, res) that you can give to an `http.Server` as its handler.
 * @param - host The hostname to proxy to
 * @param - opts
 */

// tslint:disable-next-line:cognitive-complexity
export function yaktime (host: string, opts: YakTimeOpts): YakTimeServer {
  invariant(opts.dirname != null && opts.dirname !== '', 'You must provide opts.dirname')
  const recorder = new Recorder(opts, host)

  const hits = new Set<string>()
  const yaktimeTape: YakTimeServer = async function (req, res) {
    await mkdir(opts.dirname)

    debug('req', req.url)
    debug(curl.request(req))

    const body = await buffer(req)

    try {
      const response = (await recorder.read(req, body)) || (await recorder.record(req, res, body))
      await recorder.respond(response, res)
    } catch (err) {
      res.statusCode = err.statusCode || 500
      debug(err.stack)
      res.end(err.message)
    }
  }

  yaktimeTape.hits = hits

  return yaktimeTape
}
