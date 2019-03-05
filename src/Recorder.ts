import { YakTimeOpts, ensureRecordingIsAllowed, ensureIsValidStatusCode } from './util'
import Loki from 'lokijs'
import { getDB } from './db'
import Debug from 'debug'
import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http'
import { URL } from 'url'
import { h64 } from 'xxhashjs'
import { parse } from 'querystring'
import { buffer } from './buffer'
import { proxy } from './proxy'
import * as curl from './curl'
import { isMatch } from 'lodash'

const debug = Debug('yaktime:recorder')

type Unpacked<T> = T extends (infer U)[] ? U : T extends (...args: any[]) => infer U ? U : T extends Promise<infer U> ? U : T

type SerializedRequest = ReturnType<Recorder['serializeRequest']>
type SerializedResponse = Unpacked<ReturnType<Recorder['serializeResponse']>>
interface FullSerializedRequest extends SerializedRequest {
  response: SerializedResponse
}

export class Recorder {
  opts: YakTimeOpts
  host: string
  db: Promise<Loki>
  constructor (opts: YakTimeOpts, host: string) {
    this.opts = opts
    this.host = host
    this.db = getDB(opts)
  }

  serializeRequest (req: IncomingMessage, body: any[]) {
    const fullUrl = new URL(req.url as string, this.host)
    const { method = '', httpVersion, headers, trailers } = req

    const bodyBuffer = Buffer.from(body)
    const bodyEncoded = bodyBuffer.toString('base64')
    const bodyHash = h64(bodyBuffer, 0).toString(16)

    return {
      host: fullUrl.host,
      path: fullUrl.pathname,
      body: bodyEncoded,
      bodyHash,
      method,
      httpVersion,
      headers,
      trailers,
      query: parse(fullUrl.searchParams.toString())
    }
  }

  async serializeResponse (res: IncomingMessage) {
    const statusCode = res.statusCode || 200
    const headers = res.headers
    const body = Buffer.from(await buffer<Buffer>(res)).toString('base64')
    const trailers = res.trailers

    return {
      statusCode,
      headers,
      body,
      trailers
    }
  }

  async respond (storedRes: SerializedResponse, res: ServerResponse) {
    res.statusCode = storedRes.statusCode
    res.writeHead(storedRes.statusCode, storedRes.headers)
    res.addTrailers(storedRes.trailers || {})
    console.log(storedRes.body)
    res.end(Buffer.from(storedRes.body, 'base64'))
  }

  async record (req: IncomingMessage, body: Buffer[], host: string, opts: YakTimeOpts) {
    ensureRecordingIsAllowed(req, opts)
    debug('proxy', req.url)
    const pres = await proxy(req, body, host)
    debug(curl.response(pres))
    ensureIsValidStatusCode(pres, opts)
    debug('record', req.url)
    const request = this.serializeRequest(req, body)
    const response = await this.serializeResponse(pres)
    return this.save(request, response)
  }

  async save (request: SerializedRequest, response: SerializedResponse) {
    const db = await this.db
    const tapes = db.addCollection<FullSerializedRequest>('tapes', { disableMeta: true })
    return tapes.add({ ...request, response })
  }

  async read (req: IncomingMessage, body: Buffer[]) {
    const serializedRequest = this.serializeRequest(req, body)
    return this.load(serializedRequest)
  }

  async load (request: SerializedRequest): Promise<FullSerializedRequest | null> {
    const { ignoredQueryFields = [], ignoredHeaders = [] } = this.opts.hasherOptions || {}
    const db = await this.db
    const tapes = db.addCollection<FullSerializedRequest>('tapes', { disableMeta: true })

    const { query: _query, headers: _headers } = request

    const query = {
      ..._query
    }
    const headers = {
      ..._headers
    }

    ignoredQueryFields.forEach(q => delete query[q])
    ignoredHeaders.forEach(h => delete headers[h])

    const lokiQuery = {
      ...request,
      query,
      headers
    }

    delete query.body

    return tapes.where(obj => isMatch(obj, lokiQuery))[0]
  }
}

export class DbMigrator {
  data: Buffer[] = []
  headers: IncomingHttpHeaders = {}
  statusCode = 200
  setHeader (name: string, value: string) {
    this.headers[name] = value
  }
  write (input: Buffer | string) {
    this.data.push(Buffer.isBuffer(input) ? input : Buffer.from(input))
  }

  end (data?: any) {
    if (data != null) {
      this.write(data)
    }
    debug('finished migration')
  }

  toSerializedResponse (): SerializedResponse {
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body: Buffer.concat(this.data).toString('base64'),
      trailers: {}
    }
  }
}
