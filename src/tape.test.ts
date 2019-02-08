import { ClientRequest, IncomingMessage } from 'http'
import { buildTape } from './tape'
import { EventEmitter } from 'events'

const linter = require('standard')

const isStandardJs = (js: string) => linter.lintTextSync(js, {}).errorCount === 0
const req: unknown = {
  method: 'GET',
  path: '/about?foo=bar',
  getHeaders: () => ({
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; ARM; Lumia 950 Dual SIM) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,* / *;q=0.8',
    'accept-language': 'en-US;q=0.8,en;q=0.5',
    'cache-control': 'false',
    host: 'www.google.com',
    'accept-encoding': 'gzip, deflate',
    connection: 'close'
  })
}

const getRes = (body: EventEmitter, headers: any) =>
  Object.assign(body, {
    headers,
    statusCode: 200
  })

describe('buildTape', () => {
  it('records non-readable content', async () => {
    const body = new EventEmitter()

    const res: unknown = getRes(body, {
      'content-type': 'image/gif',
      'content-encoding': 'gzip'
    })

    const tape = buildTape(req as ClientRequest, res as IncomingMessage)
    body.emit('data', Buffer.from('CHON'))
    body.emit('data', Buffer.from('MAGUE'))
    body.emit('end')
    expect(await tape).toEqual(`const { basename } = require('path')

/**
 * GET /about?foo=bar
 *
 * user-agent: Mozilla/5.0 (Windows NT 10.0; ARM; Lumia 950 Dual SIM) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393
 * accept: text/html,application/xhtml+xml,application/xml;q=0.9,* / *;q=0.8
 * accept-language: en-US;q=0.8,en;q=0.5
 * cache-control: false
 * host: www.google.com
 * accept-encoding: gzip, deflate
 * connection: close
 */

module.exports = function (req, res) {
  res.statusCode = 200

  res.setHeader('content-type', 'image/gif')
  res.setHeader('content-encoding', 'gzip')

  res.setHeader('x-yakbak-tape', basename(__filename, '.js'))

  res.write(Buffer.from('Q0hPTg==', 'base64'))
  res.write(Buffer.from('TUFHVUU=', 'base64'))
  res.end()

  return __filename
}
`)
    expect(isStandardJs(await tape)).toEqual(true)
  })

  it('record readable content', async () => {
    const body = new EventEmitter()

    const res: unknown = getRes(body, {
      'content-type': 'text/html',
      'content-encoding': 'identity'
    })

    const tape = buildTape(req as ClientRequest, res as IncomingMessage)
    body.emit('data', Buffer.from('YAK'))
    body.emit('data', Buffer.from('TIME'))
    body.emit('end')

    expect(await tape).toEqual(`const { basename } = require('path')

/**
 * GET /about?foo=bar
 *
 * user-agent: Mozilla/5.0 (Windows NT 10.0; ARM; Lumia 950 Dual SIM) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393
 * accept: text/html,application/xhtml+xml,application/xml;q=0.9,* / *;q=0.8
 * accept-language: en-US;q=0.8,en;q=0.5
 * cache-control: false
 * host: www.google.com
 * accept-encoding: gzip, deflate
 * connection: close
 */

module.exports = function (req, res) {
  res.statusCode = 200

  res.setHeader('content-type', 'text/html')
  res.setHeader('content-encoding', 'identity')

  res.setHeader('x-yakbak-tape', basename(__filename, '.js'))

  res.write(Buffer.from('YAK', 'utf8'))
  res.write(Buffer.from('TIME', 'utf8'))
  res.end()

  return __filename
}
`)
    expect(isStandardJs(await tape)).toEqual(true)
  })
})
