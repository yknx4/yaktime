// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import invariant from 'invariant'
import * as path from 'path'

import Debug from 'debug'
import { buffer } from './buffer'
import { recordIfNotFound } from './record'
import { mkdir, RequestHasher, YakTimeOpts, YakTimeServer, tapename, resolveModule } from './util'
import { HttpError } from 'restify-errors'
import * as curl from './curl'
import { migrateIfRequired } from './tapeMigrator'
import { requestHasher } from './requestHasher'

const debug = Debug('yaktime:server')

const incMessH = require('incoming-message-hash')
const messageHash: RequestHasher = incMessH.sync

/**
 * Returns a new yaktime proxy middleware.
 * @param - host The hostname to proxy to
 * @param - opts
 */

export function yaktime (host: string, opts: YakTimeOpts): YakTimeServer {
  invariant(opts.dirname != null && opts.dirname !== '', 'You must provide opts.dirname')

  return async function (req, res) {
    await mkdir(opts.dirname)

    debug('req', req.url)
    debug(curl.request(req))

    const body = await buffer(req)
    const defaultHasher = opts.migrate ? requestHasher(opts.hasherOptions) : messageHash
    const file = path.join(opts.dirname, tapename(opts.hash || defaultHasher, req, body))

    try {
      await migrateIfRequired(opts, req, body)
      const filename = await resolveModule(file).catch(recordIfNotFound(req, body, host, file, opts))
      const tape: YakTimeServer = require(filename)
      tape(req, res)
    } catch (err) {
      res.statusCode = err instanceof HttpError ? err.statusCode : 500
      debug(err.message)
      res.end(err.message)
    }
  }
}
