import Loki from 'lokijs'
import { YakTimeOpts } from './util'
import path from 'path'
import Debug from 'debug'

const debug = Debug('yaktime:db')
let db: Loki
export async function getDB (opts: YakTimeOpts): Promise<Loki> {
  if (db == null) {
    const dbPath = path.join(opts.dirname, 'tapes.json')
    debug(`Opening db on ${dbPath}`)
    db = new Loki(dbPath, { autoload: true, autosave: false, throttledSaves: true, verbose: process.env.DEBUG != null })
  }
  return db
}
