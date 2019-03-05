// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { Dir, createTmpdir } from './test/helpers/tmpdir'
import { getDB } from './db'
import { Migrator } from './Migrator'
import { copyFileAsync, writeFileAsync } from './util'
import { join } from 'path'

describe('Migrator', () => {
  let tmpdir: Dir
  let db: Loki

  beforeEach(async () => {
    tmpdir = await createTmpdir()
    await copyFileAsync(join(__dirname, './test/fixtures/example-tape.js'), join(tmpdir.dirname, 'mytape.js'))
    await writeFileAsync(join(tmpdir.dirname, 'invalid.potato'), 'thisisnotatape')
    db = await getDB({ dirname: tmpdir.dirname })
  })

  afterEach(async () => {
    db.removeCollection('tapes')
    db.close()
    await tmpdir.teardown()
  })

  test('migrates all migratable successfuly and fails gracefully', async () => {
    const migrator = new Migrator({ dirname: tmpdir.dirname }, 'http://localhost')
    expect(await migrator.migrateDirectory()).toEqual([
      'invalid.potato was not migrated: thisisnotatape is not defined',
      'mytape.js stored in tapes/1'
    ])
  })
})
