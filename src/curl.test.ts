// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { request, response } from './curl'
import { IncomingMessage } from 'http'

describe('curl', () => {
  test('formats an http.IncomingRequest', () => {
    let req = {
      httpVersion: '1.1',
      method: 'GET',
      url: 'https://www.flickr.com',
      headers: {
        host: 'www.flickr.com'
      }
    } as IncomingMessage

    expect(request(req)).toEqual('< GET https://www.flickr.com HTTP/1.1\n' + '< host: www.flickr.com\n' + '<')
  })

  test('formats an http.ServerResponse', () => {
    let res: unknown = {
      httpVersion: '1.1',
      statusCode: '200',
      headers: {
        date: 'Wed, 22 Jun 2016 22:02:31 GMT'
      }
    }

    expect(response(res as IncomingMessage)).toEqual('> HTTP/1.1 200 OK\n' + '> date: Wed, 22 Jun 2016 22:02:31 GMT\n' + '>')
  })
})
