import { IncomingMessage, STATUS_CODES } from 'http'
import { format } from 'util'

/**
 * Formats an http.IncomingMessage like curl does
 */

export function request (res: IncomingMessage): string {
  let out = format('< %s %s HTTP/%s\n', res.method, res.url, res.httpVersion)

  Object.keys(res.headers).forEach(function (name) {
    out += format('< %s: %s\n', name, res.headers[name])
  })

  return out + '<'
}

/**
 * Formats an http.ServerResponse like curl does
 */

export function response (res: IncomingMessage): string {
  let out = format('> HTTP/%s %s %s\n', res.httpVersion, res.statusCode, STATUS_CODES[res.statusCode || 100])
  Object.keys(res.headers).forEach(function (name) {
    out += format('> %s: %s\n', name, res.headers[name])
  })

  return out + '>'
}
