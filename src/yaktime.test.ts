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

const fixedUA = 'node-superagent/0.21.0'

describe('yakbak', () => {
  let server: TestServer
  let serverInfo: AddressInfo
  let tmpdir: Dir

  beforeEach(async () => {
    server = await createServer()
    serverInfo = server.address() as AddressInfo
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
          .expect('X-Yakbak-Tape', '1a574e91da6cf00ac18bc97abaed139e')
          .expect('Content-Type', 'text/html')
          .expect(201, 'OK')
          .end(function(err) {
            expect(server.requests.length).toEqual(1)
            done(err)
          })
      })

      test('writes the tape to disk', done => {
        request(yakbak)
          .get('/record/2')
          .set('host', 'localhost:3001')
          .set('user-agent', fixedUA)
          .expect('X-Yakbak-Tape', '3234ee470c8605a1837e08f218494326')
          .expect('Content-Type', 'text/html')
          .expect(201, 'OK')
          .end(function(err) {
            expect(fs.existsSync(tmpdir.join('3234ee470c8605a1837e08f218494326.js'))).toBeTruthy()
            done(err)
          })
      })

      describe('when given a custom hashing function', () => {
        beforeEach(() => {
          yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname, hash: customHash })

          // customHash creates a MD5 of the request, ignoring its querystring, headers, etc.
          function customHash(req, body) {
            let hash = crypto.createHash('md5')
            let parts = url.parse(req.url, true)

            hash.update(req.method)
            hash.update(parts.pathname)
            hash.write(body)

            return hash.digest('hex')
          }
        })

        test('uses the custom hash to create the tape name', done => {
          request(yakbak)
            .get('/record/1')
            .query({ foo: 'bar' })
            .query({ date: new Date() }) // without the custom hash, this would always cause 404s
            .set('user-agent', fixedUA)
            .set('host', 'localhost:3001')
            .expect('X-Yakbak-Tape', '3f142e515cb24d1af9e51e6869bf666f')
            .expect('Content-Type', 'text/html')
            .expect(201, 'OK')
            .end(function(err) {
              expect(fs.existsSync(tmpdir.join('3f142e515cb24d1af9e51e6869bf666f.js'))).toBeTruthy()
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
          .end(function(err) {
            expect(server.requests.length).toEqual(0)
            done(err)
          })
      })

      test('does not write the tape to disk', done => {
        request(yakbak)
          .get('/record/2')
          .set('user-agent', fixedUA)
          .set('host', 'localhost:3001')
          .end(function(err) {
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
          .end(function(err) {
            expect(!fs.existsSync(tmpdir.join('3234ee470c8605a1837e08f218494326.js'))).toBeTruthy()
            done(err)
          })
      })
    })
  })

  describe('playback', () => {
    let yakbak: any
    beforeEach(() => {
      yakbak = subject(`http://localhost:${serverInfo.port}`, { dirname: tmpdir.dirname })
    })

    beforeEach(done => {
      let file = '305c77b0a3ad7632e51c717408d8be0f.js'
      let tape = [
        'var path = require("path");',
        'module.exports = function (req, res) {',
        '  res.statusCode = 201;',
        '  res.setHeader("content-type", "text/html")',
        '  res.setHeader("x-yakbak-tape", path.basename(__filename, ".js"));',
        '  res.end("YAY");',
        '}',
        ''
      ].join('\n')

      fs.writeFile(tmpdir.join(file), tape, done)
    })

    test('does not make a request to the server', done => {
      request(yakbak)
        .get('/playback/1')
        .set('user-agent', fixedUA)
        .set('host', 'localhost:3001')
        .expect('X-Yakbak-Tape', '305c77b0a3ad7632e51c717408d8be0f')
        .expect('Content-Type', 'text/html')
        .expect(201, 'YAY')
        .end(function(err) {
          expect(server.requests.length).toEqual(0)
          done(err)
        })
    })
  })
})
