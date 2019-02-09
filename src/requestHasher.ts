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
    const { method = '', httpVersion, headers, trailers = {} } = req
    const h = h64()
    const url = req.url as string

    const { searchParams, pathname } = new URL(url, 'http://localhost')
    ignoredQueryFields.forEach(q => searchParams.delete(q))

    let query = parse(searchParams.toString())
    const newHeaders = { ...headers }

    ignoredHeaders.forEach(h => delete headers[h])

    h.update(httpVersion)
    h.update(method)
    h.update(pathname)
    h.update(stableStringifier(query))
    h.update(stableStringifier(newHeaders))
    h.update(stableStringifier(trailers))
    h.update(body)

    return h.digest().toString(16)
  }
