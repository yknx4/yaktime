// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

import { createServer, TestServer } from './test/helpers/server'
import { createTmpdir, Dir } from './test/helpers/tmpdir'
import { AddressInfo } from 'net'
import { tapename, RequestHasher } from './util'
import { requestHasher } from './requestHasher'
import { tapeMigrator } from './tapeMigrator'
import { yaktime } from './yaktime'

const incMessH = require('incoming-message-hash')
const messageHash: RequestHasher = incMessH.sync

describe('record', () => {
  let server: TestServer
  let proxyServer: TestServer
  let tmpdir: Dir
  let req: http.ClientRequest
  let serverInfo: AddressInfo
  let proxyServerInfo: AddressInfo

  beforeEach(async () => {
    tmpdir = await createTmpdir()
    server = await createServer(null)
    serverInfo = server.address() as AddressInfo
    proxyServer = await createServer(null, false, yaktime(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, migrate: false }))
    proxyServerInfo = proxyServer.address() as AddressInfo
  })

  afterEach(async () => {
    await server.teardown(null)
    await proxyServer.teardown(null)
  })

  afterEach(async () => {
    await tmpdir.teardown()
  })

  beforeEach(() => {
    req = http.request({
      host: 'localhost',
      port: proxyServerInfo.port,
      headers: {
        'User-Agent': 'My User Agent/1.0',
        Connection: 'close'
      }
    })
  })

  test('copies the file with the new name', done => {
    expect.hasAssertions()

    req.once('response', async function() {
      const serverReq = proxyServer.requests[0]
      const newHash = requestHasher({})
      const oldFileName = path.join(tmpdir.dirname, tapename(messageHash, serverReq))
      const newFileName = path.join(tmpdir.dirname, tapename(newHash, serverReq))
      expect(fs.existsSync(oldFileName)).toEqual(true)
      expect(fs.existsSync(newFileName)).toEqual(false)
      await tapeMigrator(newHash, { dirname: tmpdir.dirname })(serverReq)
      expect(fs.existsSync(oldFileName)).toEqual(true)
      expect(fs.existsSync(newFileName)).toEqual(true)
      done()
    })

    req.end()
  })
})
