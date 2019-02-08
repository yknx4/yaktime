import { IncomingMessage, ClientRequest } from 'http'
import map from 'lodash.map'
import { buffer } from './buffer'
import { ParsedMediaType, parse as contentTypeParse } from 'content-type'

const humanReadableContentTypes = ['application/javascript', 'application/json', 'text/css', 'text/html', 'text/javascript', 'text/plain']

/**
 * Returns whether a content-type is human readable based on a whitelist
 * @param - contentType
 */
function isContentTypeHumanReadable (contentType: ParsedMediaType) {
  return humanReadableContentTypes.indexOf(contentType.type) >= 0
}

/**
 * Returns whether a request's body is human readable
 * @param - req
 */
function isHumanReadable (res: IncomingMessage) {
  const contentEncoding = res.headers['content-encoding']
  const contentType = res.headers['content-type']
  const identityEncoding = !contentEncoding || contentEncoding === 'identity'

  if (!contentType) {
    return false
  }
  const parsedContentType = contentTypeParse(contentType)

  return identityEncoding && isContentTypeHumanReadable(parsedContentType)
}

function escapeComments (str: string) {
  return str
    .split('/*')
    .join('/ *')
    .split('*/')
    .join('* /')
}

function joinIndented (strings: string[], { indent = '  ', skipFirst = true } = {}) {
  return strings
    .map(str => `${indent}${str}`)
    .join('\n')
    .replace(skipFirst ? indent : '', '')
}

/**
 * Record the http interaction between `req` and `res` to an string.
 * The format is a vanilla node module that can be used as
 * an http.Server handler.
 * @param - req
 * @param - res
 */
export async function buildTape (req: ClientRequest, res: IncomingMessage) {
  const body = await buffer<Buffer>(res)
  const encoding = isHumanReadable(res) ? 'utf8' : 'base64'
  const requestText = `${(req as any).method} ${escapeComments(decodeURIComponent((req as any).path))}`
  const requestHeaders = joinIndented(map(req.getHeaders(), (value, header) => `${header}: ${escapeComments((value || '').toString())}`), {
    indent: ' * '
  })
  const responseHeaders = joinIndented(map(res.headers, (value, header) => `res.setHeader('${header}', '${value}')`))
  const bodyText = joinIndented(body.map(data => `res.write(Buffer.from('${data.toString(encoding)}', '${encoding}'))`))

  return `const { basename } = require('path')

/**
 * ${requestText}
 *
 * ${requestHeaders}
 */

module.exports = function (req, res) {
  res.statusCode = ${res.statusCode}

  ${responseHeaders}

  res.setHeader('x-yakbak-tape', basename(__filename, '.js'))

  ${bodyText}
  res.end()

  return __filename
}
`
}
