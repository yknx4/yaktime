// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as path from 'path'
import * as fs from 'fs'

function read (file: string) {
  return fs.readFileSync(path.join(__dirname, file + '.js'), 'utf8')
}

/**
 * node >= 1.5.0 sends the content-length whenever possible
 * @see https://github.com/nodejs/node/pull/1062
 */

export default read('v1.5.0')
