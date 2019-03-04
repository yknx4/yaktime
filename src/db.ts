import Loki from 'lokijs'
import { YakTimeOpts } from './util'
import path from 'path'

let db: Loki
export async function getDB (opts: YakTimeOpts) {
  if (db == null) {
    db = new Loki(path.join(opts.dirname, 'tapes.json'))
  }
  return db
}
