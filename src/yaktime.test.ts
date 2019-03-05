// tslint:disable:no-duplicate-string
// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { yaktime as subject } from './yaktime'
import request from 'supertest'
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as url from 'url'
import { AddressInfo } from 'net'
import { TestServer, createServer } from './test/helpers/server'
import { Dir, createTmpdir } from './test/helpers/tmpdir'
import { RequestHasher } from './util'
import { getDB } from './db'

const fixedUA = 'node-superagent/0.21.0'

// tslint:disable-next-line:no-big-function
describe('yakbak', () => {
  let server: TestServer
  let serverInfo: AddressInfo
  let tmpdir: Dir
  let db: Loki

  const tapeExists = (id: string = '-1') => db.getCollection('tapes').get(parseInt(id, 10)) != null

  beforeEach(async () => {
    server = await createServer()
    serverInfo = server.address() as AddressInfo
  })

  afterEach(async () => {
    await server.closeAsync()
  })

  beforeEach(async () => {
    tmpdir = await createTmpdir()
    db = await getDB({ dirname: tmpdir.dirname })
  })

  afterEach(async () => {
    db.removeCollection('tapes')
    db.close()
    await tmpdir.teardown()
  })

  describe('record', () => {
    describe('when recording is enabled', () => {
      let yakbak: any
      beforeEach(() => {
        yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname })
      })

      test('proxies the request to the server', done => {
        request(yakbak)
          .get('/record/1')
          .set('host', 'localhost:3001')
          .set('user-agent', fixedUA)
          .expect('X-Yakbak-Tape', /\d+/)
          .expect('Content-Type', 'text/html')
          .expect(201, 'OK')
          .end(function (err) {
            expect(server.requests.length).toEqual(1)
            done(err)
          })
      })

      test('writes the tape', done => {
        request(yakbak)
          .get('/record/2')
          .set('host', 'localhost:3001')
          .set('user-agent', fixedUA)
          .expect('X-Yakbak-Tape', /\d+/)
          .expect('Content-Type', 'text/html')
          .expect(201, 'OK')
          .end(async (err, res) => {
            expect(tapeExists(res.header['x-yakbak-tape'])).toEqual(true)
            done(err)
          })
      })

      describe('when given a custom hashing function', () => {
        beforeEach(() => {
          // customHash creates a MD5 of the request, ignoring its querystring, headers, etc.
          const customHash: RequestHasher = function customHash (req, body) {
            let hash = crypto.createHash('md5')
            let parts = url.parse(req.url as string, true)

            hash.update(req.method as string)
            hash.update(parts.pathname as string)
            hash.write(body)

            return hash.digest('hex')
          }
          yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, hash: customHash })
        })

        test('uses the custom hash to create the tape name', done => {
          request(yakbak)
            .get('/record/1')
            .query({ foo: 'bar' })
            .query({ date: new Date() }) // without the custom hash, this would always cause 404s
            .set('user-agent', fixedUA)
            .set('host', 'localhost:3001')
            .expect('X-Yakbak-Tape', /\d+/)
            .expect('Content-Type', 'text/html')
            .expect(201, 'OK')
            .end(function (err, res) {
              expect(tapeExists(res.header['x-yakbak-tape'])).toEqual(true)
              done(err)
            })
        })
      })
    })

    describe('when recording is not enabled', () => {
      let yakbak: any
      beforeEach(() => {
        yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, noRecord: true })
      })

      test('returns a 404 error', done => {
        request(yakbak)
          .get('/record/2')
          .set('user-agent', fixedUA)
          .set('host', 'localhost:3001')
          .expect(404)
          .end(done)
      })

      test('does not make a request to the server', done => {
        request(yakbak)
          .get('/record/2')
          .set('user-agent', fixedUA)
          .set('host', 'localhost:3001')
          .end(function (err) {
            expect(server.requests.length).toEqual(0)
            done(err)
          })
      })

      test('does not write the tape to disk', done => {
        request(yakbak)
          .get('/record/2')
          .set('user-agent', fixedUA)
          .set('host', 'localhost:3001')
          .end(function (err) {
            expect(!fs.existsSync(tmpdir.join('3234ee470c8605a1837e08f218494326.js'))).toBeTruthy()
            done(err)
          })
      })
    })

    describe('when onlySuccessResponse is enabled', () => {
      let yakbak: any
      beforeEach(async () => {
        /* tear down the server created in global scope as we
         need different server object which can send response with failed status code*/
        await server.closeAsync()
      })

      beforeEach(async () => {
        /* Send the failed response for the requests this server handles */
        server = await createServer(true)
        serverInfo = server.address() as AddressInfo
      })

      beforeEach(() => {
        yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, recordOnlySuccess: true })
      })

      test('does not write the tape to disk if response statusCode is not 2XX', done => {
        request(yakbak)
          .get('/record/2')
          .set('user-agent', fixedUA)
          .set('host', 'localhost:3001')
          .expect(404)
          .end(function (err) {
            expect(!fs.existsSync(tmpdir.join('3234ee470c8605a1837e08f218494326.js'))).toBeTruthy()
            done(err)
          })
      })
    })
  })

  describe('playback', () => {
    let yakbak: any
    let yakbakWithDb: any
    let id: number
    beforeEach(async () => {
      await tmpdir.teardown()
      await tmpdir.setup()
      yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname })
      yakbakWithDb = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, useDb: true, migrate: true })
    })

    beforeEach(async () => {
      const result = await db.addCollection('tapes', { disableMeta: true }).add({
        path: '/playback/1',
        body: '',
        bodyHash: 'ef46db3751d8e999',
        method: 'GET',
        httpVersion: '1.1',
        headers: {},
        trailers: {},
        query: {},
        response: {
          statusCode: 201,
          headers: {
            'content-type': 'text/html'
          },
          body: Buffer.from('YAY').toString('base64')
        }
      })
      id = result.$loki
    })

    const test1 = (yak: any) =>
      request(yak)
        .get('/playback/1')
        .set('user-agent', fixedUA)
        .set('host', 'localhost:3001')
        .expect('X-Yakbak-Tape', `${id}`)
        .expect('Content-Type', 'text/html')
        .expect(201, 'YAY')

    test('does not make a request to the server', async () => {
      await test1(yakbak)
      await test1(yakbakWithDb)
      expect(server.requests.length).toEqual(0)
    })
  })
})
