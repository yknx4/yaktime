// Copyright 2016 Yahoo Inc.
// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import * as path from 'path'
import { tmpdir } from 'os'
import { mkdir } from '../../util'
import rimraf from 'rimraf'
import { promisify } from 'util'

export const rmrf = promisify(rimraf)

/**
 * Creates a temporary directory for use in tests.
 * @param {Function} done
 * @returns {Object}
 */

export async function createTmpdir () {
  const dir = new Dir()
  await dir.setup()
  return dir
}

export class Dir {
  dirname = path.join(tmpdir(), String(Date.now()))
  join (leadPath: string) {
    return path.join(this.dirname, leadPath)
  }
  async setup () {
    await mkdir(this.dirname)
  }
  async teardown () {
    await rmrf(this.dirname)
  }
}
