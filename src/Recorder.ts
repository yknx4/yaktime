import { YakTimeOpts, ensureRecordingIsAllowed, ensureIsValidStatusCode } from './util'
import Loki from 'lokijs'
import { getDB } from './db'
import Debug from 'debug'
import { IncomingMessage, ServerResponse, IncomingHttpHeaders } from 'http'
import { URL } from 'url'
import { h64 } from 'xxhashjs'
import { parse } from 'querystring'
import * as curl from './curl'
import { isMatch, pick } from 'lodash'
import httpProxy from 'http-proxy'
import { buffer } from './buffer'
import assert from 'assert'

const debug = Debug('yaktime:recorder')

type Unpacked<T> = T extends (infer U)[] ? U : T extends (...args: any[]) => infer U ? U : T extends Promise<infer U> ? U : T

type SerializedRequest = ReturnType<Recorder['serializeRequest']>
type SerializedResponse = Unpacked<ReturnType<Recorder['serializeResponse']>>
interface FullSerializedRequest extends SerializedRequest {
  $loki?: number
  response: SerializedResponse
}

export class Recorder {
  opts: YakTimeOpts
  host: string
  db: Promise<Loki>
  proxy: httpProxy
  constructor (opts: YakTimeOpts, host: string) {
    this.opts = opts
    this.host = host
    this.db = getDB(opts)
    this.proxy = httpProxy.createProxyServer({ target: host, xfwd: true, changeOrigin: true, autoRewrite: true })
  }

  serializeRequest (req: IncomingMessage, body: Buffer) {
    const fullUrl = new URL(req.url as string, this.host)
    const { method, httpVersion, headers, trailers } = req

    const bodyEncoded = body.toString('base64')
    const bodyHash = h64(body, 0).toString(16)

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

  async serializeResponse (res: IncomingMessage, body: Buffer) {
    const statusCode = res.statusCode as number
    const headers = res.headers
    const trailers = res.trailers

    return {
      statusCode,
      headers,
      body: body.toString('base64'),
      trailers
    }
  }

  async respond (storedReq: FullSerializedRequest, res: ServerResponse) {
    assert(res.headersSent === false, 'Response has already been delivered')
    const storedRes = storedReq.response
    res.statusCode = storedRes.statusCode
    if (storedReq.trailers != null && storedReq.trailers !== {}) {
      res.addTrailers(storedReq.trailers)
    }
    res.writeHead(storedRes.statusCode, { 'x-yakbak-tape': storedReq.$loki, ...storedReq.response.headers })
    res.end(Buffer.from(storedReq.response.body, 'base64'))
  }

  async record (req: IncomingMessage, res: ServerResponse, body: Buffer): Promise<FullSerializedRequest> {
    ensureRecordingIsAllowed(req, this.opts)
    debug('proxy', req.url)
    const request = this.serializeRequest(req, body)

    const proxyRes: IncomingMessage = await new Promise((resolve, reject) => {
      this.proxy.once('proxyRes', async (proxyRes: IncomingMessage) => {
        resolve(proxyRes)
      })
      this.proxy.once('error', reject)
      this.proxy.web(req, res, { selfHandleResponse: true })
    })

    debug(curl.response(proxyRes))
    debug('record', req.url)
    ensureIsValidStatusCode(proxyRes, this.opts)
    const proxiedResponseBody = await buffer(proxyRes)
    const response = await this.serializeResponse(proxyRes, proxiedResponseBody)
    return this.save(request, response)
  }

  async save (request: SerializedRequest, response: SerializedResponse) {
    const db = await this.db
    const tapes = db.addCollection<FullSerializedRequest>('tapes', { disableMeta: true })
    return tapes.add({ ...request, response })
  }

  async read (req: IncomingMessage, body: Buffer) {
    const serializedRequest = this.serializeRequest(req, body)
    return this.load(serializedRequest)
  }

  async load (request: SerializedRequest): Promise<FullSerializedRequest | null> {
    const { ignoredQueryFields = [], allowedHeaders = [] } = this.opts
    const db = await this.db
    const tapes = db.addCollection<FullSerializedRequest>('tapes', { disableMeta: true })

    const { query: _query, headers: _headers } = request

    const query = {
      ..._query
    }
    const headers = pick(_headers, ['x-cassette-id', ...allowedHeaders])

    ignoredQueryFields.forEach(q => delete query[q])

    const lokiQuery = {
      ...request,
      query,
      headers
    }

    delete lokiQuery.body
    delete lokiQuery.host

    return tapes.where(obj => isMatch(obj, lokiQuery))[0]
  }
}
