// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as http from 'http'
import * as fs from 'fs'
import { record as subject } from './record'

import fixture from './test/fixtures'
import { createServer, TestServer } from './test/helpers/server'
import { createTmpdir, Dir } from './test/helpers/tmpdir'
import { AddressInfo } from 'net'

describe('record', () => {
  let server: TestServer
  let tmpdir: Dir
  let req: http.ClientRequest

  beforeEach(async () => {
    server = await createServer()
  })

  afterEach(async () => {
    await server.closeAsync()
  })

  beforeEach(async () => {
    tmpdir = await createTmpdir()
  })

  afterEach(async () => {
    await tmpdir.teardown()
  })

  beforeEach(() => {
    const info = server.address() as AddressInfo
    req = http.request({
      host: 'localhost',
      port: info.port,
      headers: {
        'User-Agent': 'My User Agent/1.0',
        Connection: 'close'
      }
    })
  })

  test('returns the filename', done => {
    expect.assertions(1)
    req.on('response', async function(res: http.IncomingMessage) {
      const filename = await subject(req, res, tmpdir.join('foo.js'))
      expect(filename).toEqual(tmpdir.join('foo.js'))
      done()
    })

    req.end()
  })

  test('records the response to disk', done => {
    const info = server.address() as AddressInfo
    let expected = fixture.replace('{addr}', 'localhost').replace('{port}', `${info.port}`)

    req.on('response', function(res: http.IncomingMessage) {
      subject(req, res, tmpdir.join('foo.js'))
        .then(function(filename) {
          expect(fs.readFileSync(filename, 'utf8')).toEqual(expected)
          done()
        })
        .catch(function(err) {
          done(err)
        })
    })

    req.end()
  })
})
