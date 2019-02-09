import { promisify } from 'util'
import { readFile, writeFile, existsSync, copyFile, readdir } from 'fs'
import mkdirp from 'mkdirp'
import { IncomingMessage, ServerResponse } from 'http'
import Debug from 'debug'
import { ModuleNotFoundError, InvalidStatusCodeError, RecordingDisabledError } from './errors'
import { RequestHasherOptions } from './requestHasher'

const debug = Debug('yaktime:util')

export const mkdir = promisify(mkdirp)

export const readFileAsync = promisify(readFile)
export const writeFileAsync = promisify(writeFile)
export const copyFileAsync = promisify(copyFile)
export const readDirAsync = promisify(readdir)

/**
 * Returns the tape name for `req`.
 */

export function tapename (hashFn: RequestHasher, req: IncomingMessage, body: Buffer[] = []) {
  return hashFn(req, Buffer.concat(body)) + '.js'
}

export function isValidStatusCode (code: number = 0) {
  return code >= 200 && code < 400
}

export type RequestHasher = (req: IncomingMessage, body: Buffer) => string

export interface YakTimeOpts {
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
   * Function that returns hash of a request
   */
  hash?: RequestHasher
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
  /**
   * Options to considerate when hashing
   * this are only used when `opts.hash` is null
   */
  hasherOptions?: RequestHasherOptions
}

export interface YakTimeServer {
  (request: IncomingMessage, response: ServerResponse): void
  hits?: Set<string>
}

export function resolveModule (file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    debug(`resolve`, file)
    let fileName = require.resolve(file)

    // If tape was deleted, then throw module not found error
    // so that it can be re-recorded instead of failing on
    // require
    if (!existsSync(fileName)) {
      reject(new ModuleNotFoundError('File does not exist'))
    }

    resolve(fileName)
  })
}

export function ensureIsValidStatusCode (res: IncomingMessage, opts: YakTimeOpts) {
  if (opts.recordOnlySuccess && !isValidStatusCode(res.statusCode)) {
    debug('failed', 'status', res.statusCode)
    throw new InvalidStatusCodeError('Only Successful responses will be recorded', res)
  }
}

export function ensureIsModuleNotFoundError (e: ModuleNotFoundError) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e
  }
}

export function ensureRecordingIsAllowed (req: IncomingMessage, opts: YakTimeOpts) {
  if (opts.noRecord) {
    debug('no record', req.url)
    throw new RecordingDisabledError('Recording Disabled')
  }
}

export function captureAll (regex: RegExp, str: string) {
  const result = []
  regex.lastIndex = 0
  let prev: RegExpExecArray | null = null
  do {
    prev = regex.exec(str)
    if (prev != null) {
      const [, ...matches] = prev
      result.push(matches)
    }
  } while (prev != null)

  regex.lastIndex = 0
  return result
}
