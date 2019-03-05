// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import Debug from 'debug'
import { ClientRequest, IncomingMessage } from 'http'
import { buildTape } from './tape'
import { writeFileAsync, ensureIsModuleNotFoundError, ensureRecordingIsAllowed, ensureIsValidStatusCode, YakTimeOpts } from './util'
import { ModuleNotFoundError } from './errors'
import { proxy } from './proxy'
import * as curl from './curl'

const debug = Debug('yaktime:legacy-record')

/**
 * Write `data` to `filename`.
 * @param - filename
 * @param - data
 */

function write (filename: string, data: string) {
  debug('write', filename)
  return writeFileAsync(filename, data, 'utf8')
}

/**
 * Record the http interaction between `req` and `res` to disk.
 * The format is a vanilla node module that can be used as
 * an http.Server handler.
 * @param - req
 * @param - res
 * @param - filename
 */

export async function record (req: ClientRequest, res: IncomingMessage, filename: string) {
  const tapeCode = await buildTape(req, res)
  await write(filename, tapeCode)
  return filename
}

export const recordIfNotFound = (req: IncomingMessage, body: Buffer[], host: string, file: string, opts: YakTimeOpts) =>
  async function recordIfNotFound (e: ModuleNotFoundError) {
    ensureIsModuleNotFoundError(e)
    ensureRecordingIsAllowed(req, opts)

    debug('proxy', req.url)
    const pres = await proxy(req, body, host)
    debug(curl.response(pres))
    ensureIsValidStatusCode(pres, opts)
    debug('record', req.url)
    return record(pres.req, pres, file)
  }
