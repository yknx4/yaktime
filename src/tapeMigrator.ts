import { RequestHasher, YakTimeOpts, tapename, copyFileAsync } from './util'
import * as path from 'path'
import Debug from 'debug'
import { IncomingMessage } from 'http'
import { existsSync } from 'fs'
import { requestHasher } from './requestHasher'
import { Recorder, DbMigrator } from './Recorder'

const debug = Debug('yaktime:tape-migrator')

const incMessH = require('incoming-message-hash')
const oldHasher: RequestHasher = incMessH.sync

type tapeMigratorOptions = 'dirname' | 'oldHash'
export const fileTapeMigrator = (newHasher: RequestHasher, opts: Pick<YakTimeOpts, tapeMigratorOptions>) =>
  async function tapeMigrator (req: IncomingMessage, body: Buffer[] = []) {
    const oldFileName = path.join(opts.dirname, tapename(opts.oldHash || oldHasher, req, body))
    const newFileName = path.join(opts.dirname, tapename(newHasher, req, body))
    const oldExists = existsSync(oldFileName)

    if (oldExists) {
      debug('migrating to file')
      debug('old filename', oldFileName)
      const newExists = existsSync(newFileName)
      if (newExists) {
        return debug('skipping migration', newFileName, 'already exists')
      }

      debug('new filename', newFileName)
      await copyFileAsync(oldFileName, newFileName)
      debug('remove old file manually')
    }
  }

export const dbTapeMigrator = (host: string, opts: YakTimeOpts) =>
  async function tapeMigrator (req: IncomingMessage, body: Buffer[] = []) {
    if (opts.useDb !== true) {
      return
    }
    const recorder = new Recorder(opts, host)
    const oldFileName = path.join(opts.dirname, tapename(opts.oldHash || oldHasher, req, body))
    const oldExists = existsSync(oldFileName)

    if (oldExists) {
      debug('migrating to db')
      debug('filename', oldFileName)
      const newExists = (await recorder.read(req, body)) != null
      if (newExists) {
        return debug('skipping migration, it is already migrated')
      }

      const migrator = new DbMigrator()
      require(oldFileName)(null, migrator)
      const request = recorder.serializeRequest(req, body)
      const response = migrator.toSerializedResponse()
      debug('saving to db')
      await recorder.save(request, response)
    }
  }

type migrateIfRequiredOptions = 'hash' | 'migrate' | 'hasherOptions' | 'useDb'
export async function migrateIfRequired (
  host: string,
  opts: Pick<YakTimeOpts, migrateIfRequiredOptions | tapeMigratorOptions>,
  req: IncomingMessage,
  body: Buffer[] = []
) {
  if (opts.hash != null || opts.migrate === false) {
    return
  }
  const newHasher = requestHasher(opts.hasherOptions)
  await dbTapeMigrator(host, opts)(req, body)
  await fileTapeMigrator(newHasher, opts)(req, body)
}
