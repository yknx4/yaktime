// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { proxy as subject } from './proxy'
import { createServer, TestServer } from './test/helpers/server'
import { IncomingMessage } from 'http'
import { AddressInfo, Socket } from 'net'

describe('proxy', () => {
  let server: TestServer
  let serverInfo: AddressInfo
  let req: IncomingMessage

  beforeEach(async () => {
    server = await createServer()
    serverInfo = server.address() as AddressInfo
  })

  afterEach(async () => {
    await server.closeAsync()
  })

  beforeEach(() => {
    req = new IncomingMessage((null as unknown) as Socket)
    req.method = 'GET'
    req.url = '/'
    req.headers['connection'] = 'close'
  })

  test('proxies the request', async () => {
    expect.hasAssertions()

    const _preq = server.nextRequest()
    await subject(req, [], `http://127.0.0.1:${serverInfo.port}`)
    const preq = await _preq
    expect(preq.method).toEqual(req.method)
    expect(preq.url).toEqual(req.url)
    expect(preq.headers.host).toEqual('127.0.0.1' + ':' + serverInfo.port)
  })

  it('overrides the host if one is set on the incoming request', async () => {
    expect.hasAssertions()
    req.headers['host'] = 'A.N.OTHER'
    const preq = server.nextRequest()
    await subject(req, [], `http://127.0.0.1:${serverInfo.port}`)
    expect((await preq).headers.host).toEqual(`127.0.0.1:${serverInfo.port}`)
  })

  test('proxies the request body', done => {
    let body = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')]
    type onType = (buf?: any, cb?: any) => void

    server.once('request', function (_req: { on: onType }) {
      let data: Buffer[] = []

      _req.on('data', function (buf: Buffer) {
        data.push(buf)
      })

      _req.on('end', function () {
        expect(Buffer.concat(data)).toEqual(Buffer.concat(body))
        done()
      })
    })

    req.method = 'POST'

    subject(req, body, `http://127.0.0.1:${serverInfo.port}`).catch(function (err: any) {
      done(err)
    })
  })

  test('yields the response', async () => {
    const res = await subject(req, [], `http://127.0.0.1:${serverInfo.port}`)
    expect(res.statusCode).toEqual(201)
  })
})
