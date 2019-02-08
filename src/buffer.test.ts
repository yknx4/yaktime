// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { buffer as subject } from './buffer'
import * as stream from 'stream'

describe('buffer', () => {
  test('yields the stream contents', done => {
    let str = new stream.PassThrough()

    subject(str)
      .then(function(body) {
        expect(body).toEqual([Buffer.from('a'), Buffer.from('b'), Buffer.from('c')])
        done()
      })
      .catch(function(err) {
        done(err)
      })

    str.write('a')
    str.write('b')
    str.write('c')
    str.end()
  })

  test('yields an error', done => {
    let str = new stream.PassThrough()

    subject(str)
      .then(function() {
        done(new Error('should have yielded an error'))
      })
      .catch(function(err) {
        expect(err.message).toEqual('boom')
        done()
      })

    str.emit('error', new Error('boom'))
  })
})
