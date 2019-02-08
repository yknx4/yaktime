// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { Readable } from 'stream'

/**
 * Collect `stream`'s data in to an array of Buffers.
 * @param - stream
 */

export function buffer<T = any> (stream: Readable): Promise<T[]> {
  return new Promise(function (resolve, reject) {
    let data: T[] = []

    stream.on('data', function (buf) {
      data.push(buf)
    })

    stream.on('error', function (err) {
      reject(err)
    })

    stream.on('end', function () {
      resolve(data)
    })
  })
}
