#!/usr/bin/env node

// Copyright 2019 Ale Figueroa
// Licensed under the terms of the MIT license. Please see LICENSE file in the project root for terms.

import { Migrator } from './Migrator'
import { getDB } from './db'

async function main () {
  if (!process.argv[2]) {
    throw new Error('host is required')
  }
  if (!process.argv[3]) {
    throw new Error('tapes dir is required')
  }
  const migrator = new Migrator({ dirname: process.argv[3] }, process.argv[2])
  const result = await migrator.migrateDirectory()
  result.forEach(r => console.log(r))
  const db = await getDB(migrator.opts)
  await new Promise(resolve => {
    db.saveDatabase(resolve)
  })
  process.exit(0)
}

main().catch(err => {
  console.warn('%s: %s', err.name, err.message)
  console.warn(`Usage: migrate-yaktime <host> <tapes dir>`)
  process.exit(1)
})
