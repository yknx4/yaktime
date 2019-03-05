// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { Readable } from 'stream'

/**
 * Collect `stream`'s data in to an array of Buffers.
 * @param - stream
 */

export function buffer (stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let body = Buffer.from('')
    stream.on('data', function (data) {
      body = Buffer.concat([body, data])
    })
    stream.on('end', function () {
      resolve(body)
    })
    stream.on('error', reject)
  })
}
