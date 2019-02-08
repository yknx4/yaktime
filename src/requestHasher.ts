import { h64 } from 'xxhashjs'
import { IncomingMessage } from 'http'
import invariant from 'invariant'
import { parse } from 'querystring'
import stableStringifier from 'fast-json-stable-stringify'

export interface RequestHasherOptions {
  ignoredQueryFields?: string[]
  ignoredHeaders?: string[]
}

type HasheableFields = 'url' | 'headers' | 'httpVersion' | 'method' | 'trailers'
export type HasherRequest = Pick<IncomingMessage, HasheableFields>

export const requestHasher = ({ ignoredQueryFields = [], ignoredHeaders = [] }: RequestHasherOptions = {}) =>
  function requestHasher (req: HasherRequest, body: Buffer = Buffer.from('')) {
    invariant(req.url != null, 'URL is not valid')
    const h = h64()
    const url = req.url as string

    const parts = new URL(url, 'http://localhost')
    const searchParams = parts.searchParams
    ignoredQueryFields.forEach(q => searchParams.delete(q))

    let query = parse(parts.searchParams.toString())
    const headers = { ...req.headers }

    ignoredHeaders.forEach(h => delete headers[h])

    h.update(req.httpVersion)
    h.update(req.method || '')
    h.update(parts.pathname || '')
    h.update(stableStringifier(query))
    h.update(stableStringifier(headers))
    h.update(stableStringifier(req.trailers))
    h.update(body)

    return h.digest().toString(16)
  }
