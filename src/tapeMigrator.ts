import { RequestHasher, YakTimeOpts, tapename, copyFileAsync } from './util'
import * as path from 'path'
import Debug from 'debug'
import { IncomingMessage } from 'http'
import { existsSync } from 'fs'
import { requestHasher } from './requestHasher'

const debug = Debug('yaktime:tape-migrator')

const incMessH = require('incoming-message-hash')
const oldHasher: RequestHasher = incMessH.sync

type tapeMigratorOptions = 'dirname' | 'oldHash'
export const tapeMigrator = (newHasher: RequestHasher, opts: Pick<YakTimeOpts, tapeMigratorOptions>) =>
  async function tapeMigrator (req: IncomingMessage, body: Buffer[] = []) {
    const oldFileName = path.join(opts.dirname, tapename(opts.oldHash || oldHasher, req, body))
    const newFileName = path.join(opts.dirname, tapename(newHasher, req, body))
    const oldExists = existsSync(oldFileName)

    if (oldExists) {
      debug('migrating')
      debug('old filename', oldFileName)
      const newExists = existsSync(newFileName)
      if (newExists) {
        debug('skipping migration', newFileName, 'already exists')
        return
      }
      debug('new filename', newFileName)
      await copyFileAsync(oldFileName, newFileName)
      debug('remove old file manually')
    }
  }

type migrateIfRequiredOptions = 'hash' | 'migrate' | 'hasherOptions'
export async function migrateIfRequired (
  opts: Pick<YakTimeOpts, migrateIfRequiredOptions | tapeMigratorOptions>,
  req: IncomingMessage,
  body: Buffer[] = []
) {
  if (opts.hash != null || opts.migrate === false) {
    return
  }
  const newHasher = requestHasher(opts.hasherOptions)
  await tapeMigrator(newHasher, opts)(req, body)
}
