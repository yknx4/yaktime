import { promisify } from 'util'
import { readFile, writeFile, copyFile, readdir } from 'fs'
import mkdirp from 'mkdirp'
import { IncomingMessage, ServerResponse } from 'http'
import Debug from 'debug'
import { InvalidStatusCodeError, RecordingDisabledError } from './errors'

const debug = Debug('yaktime:util')

export const mkdir = promisify(mkdirp)

export const readFileAsync = promisify(readFile)
export const writeFileAsync = promisify(writeFile)
export const copyFileAsync = promisify(copyFile)
export const readDirAsync = promisify(readdir)

export function isValidStatusCode (code: number = 0) {
  return code >= 200 && code < 400
}

export type RequestHasher = (req: IncomingMessage, body: Buffer) => string

export interface YakTimeOpts {
  ignoredQueryFields?: string[]
  allowedHeaders?: string[]
  /**
   * The tapes directory
   */
  dirname: string
  /**
   * if true, requests will return a 404 error if the tape doesn't exist
   */
  noRecord?: boolean
  /**
   * if true, only successful requests will be recorded
   */
  recordOnlySuccess?: boolean
  /**
   * Function that returns hash of existing requests
   * this will be use to migrate from old requests to newer
   */
  oldHash?: RequestHasher
  /**
   * If set to true, it will migrate old files to new file using a newer faster hasher.
   * old files will not be deleted, if `opts.hash` is defined, this will be ignored
   */
  migrate?: boolean
}

export interface YakTimeServer {
  (request: IncomingMessage, response: ServerResponse): void
  hits?: Set<string>
}

export function ensureIsValidStatusCode (res: IncomingMessage, opts: YakTimeOpts) {
  if (opts.recordOnlySuccess && !isValidStatusCode(res.statusCode)) {
    debug('failed', 'status', res.statusCode)
    throw new InvalidStatusCodeError('Only Successful responses will be recorded', res)
  }
}

export function ensureRecordingIsAllowed (req: IncomingMessage, opts: YakTimeOpts) {
  if (opts.noRecord) {
    debug('no record', req.url)
    throw new RecordingDisabledError('Recording Disabled')
  }
}
