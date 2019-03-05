// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

import { createServer, TestServer } from './test/helpers/server'
import { createTmpdir, Dir } from './test/helpers/tmpdir'
import { AddressInfo } from 'net'
import { tapename, RequestHasher, YakTimeOpts } from './util'
import { requestHasher } from './requestHasher'
import { fileTapeMigrator, dbTapeMigrator } from './tapeMigrator'
import { yaktime } from './yaktime'
import { notifyNotUsedTapes } from './tracker'
import { Recorder } from './Recorder'

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
    server = await createServer()
    serverInfo = server.address() as AddressInfo
    const opts = { dirname: tmpdir.dirname, migrate: false }
    const tape = yaktime(`http://localhost:${serverInfo.port}`, opts)
    proxyServer = await createServer(false, tape)
    proxyServer.once('close', () => notifyNotUsedTapes(opts, tape.hits))
    proxyServerInfo = proxyServer.address() as AddressInfo
  })

  afterEach(async () => {
    await server.closeAsync()
    await proxyServer.closeAsync()
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

    req.once('response', async function () {
      const serverReq = proxyServer.requests[0]
      const newHash = requestHasher({})
      const oldFileName = path.join(tmpdir.dirname, tapename(messageHash, serverReq))
      const newFileName = path.join(tmpdir.dirname, tapename(newHash, serverReq))
      expect(fs.existsSync(oldFileName)).toEqual(true)
      expect(fs.existsSync(newFileName)).toEqual(false)
      await fileTapeMigrator(newHash, { dirname: tmpdir.dirname })(serverReq)
      expect(fs.existsSync(oldFileName)).toEqual(true)
      expect(fs.existsSync(newFileName)).toEqual(true)
      done()
    })

    req.end()
  })

  test('add existing request to the db', done => {
    expect.hasAssertions()

    req.once('response', async function () {
      const migrator = new Recorder({ dirname: tmpdir.dirname, useDb: true } as YakTimeOpts, `http://localhost:${serverInfo.port}`)
      const serverReq = proxyServer.requests[0]
      const oldFileName = path.join(tmpdir.dirname, tapename(messageHash, serverReq))
      expect(fs.existsSync(oldFileName)).toEqual(true)
      expect(await migrator.read(serverReq, [])).toBeUndefined()
      await dbTapeMigrator(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, useDb: true })(serverReq)
      expect(fs.existsSync(oldFileName)).toEqual(true)
      expect(await migrator.read(serverReq, [])).toEqual(
        expect.objectContaining({
          method: 'GET',
          path: '/',
          response: expect.objectContaining({
            statusCode: 201,
            body: 'T0s='
          })
        })
      )
      done()
    })

    req.end()
  })
})
